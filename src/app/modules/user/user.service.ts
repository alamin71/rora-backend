import { PipelineStage } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import unlinkFile from '../../../shared/unlinkFile';
import { IUser } from './user.interface';
import { User } from './user.model';
import AppError from '../../../errors/AppError';
import { USER_ROLES, USER_STATUS } from '../../../enums/user';
import { Call } from '../call/call.model';
import { Wallet } from '../wallet/wallet.model';
import { CALL_STATUS } from '../../../enums/call';
import countryFromPhone from '../../../utils/countryFromPhone';

// get user profile
const getUserProfileFromDB = async (
  user: JwtPayload
): Promise<Partial<IUser>> => {
  const { id } = user;
  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  return isExistUser;
};

// update user profile
const updateProfileToDB = async (
  user: JwtPayload,
  payload: Partial<IUser>
): Promise<Partial<IUser | null>> => {
  const { id } = user;
  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  if (
    payload.image &&
    isExistUser.image &&
    !isExistUser.image.startsWith('http://') &&
    !isExistUser.image.startsWith('https://')
  ) {
    unlinkFile(isExistUser.image);
  }

  const updateDoc = await User.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });

  return updateDoc;
};

const verifyUserPassword = async (userId: string, password: string) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'User not found.');
  }
  const isPasswordValid = await User.isMatchPassword(password, user.password);
  return isPasswordValid;
};
const deleteUser = async (id: string) => {
  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  await User.findByIdAndUpdate(id, {
    $set: { isDeleted: true },
  });

  return true;
};
const getCustomerStats = async () => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfToday);
  const dayIndex = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - (dayIndex === 0 ? 6 : dayIndex - 1));
  const thirtyDaysAgo = new Date(startOfToday);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [total, newThisWeek, blocked, activeCustomerIds] = await Promise.all([
    User.countDocuments({ role: USER_ROLES.USER }),
    User.countDocuments({
      role: USER_ROLES.USER,
      createdAt: { $gte: startOfWeek },
    }),
    User.countDocuments({ role: USER_ROLES.USER, status: USER_STATUS.BLOCKED }),
    Call.distinct('customerId', { requestedAt: { $gte: thirtyDaysAgo } }),
  ]);

  return {
    total,
    active30d: activeCustomerIds.length,
    newThisWeek,
    blocked,
  };
};

const listCustomersAdmin = async (query: {
  page?: number;
  limit?: number;
  search?: string;
  status?: USER_STATUS;
}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));

  const match: Record<string, unknown> = { role: USER_ROLES.USER };
  if (query.status) match.status = query.status;
  if (query.search) {
    const regex = { $regex: query.search, $options: 'i' };
    match.$or = [{ name: regex }, { phone: regex }];
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const pipeline: PipelineStage[] = [
    { $match: match },
    {
      $lookup: {
        from: 'wallets',
        localField: '_id',
        foreignField: 'userId',
        as: 'wallet',
      },
    },
    { $unwind: { path: '$wallet', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'calls',
        let: { customerId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$customerId', '$$customerId'] } } },
          {
            $group: {
              _id: null,
              callCount: { $sum: 1 },
              spendMtd: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$status', CALL_STATUS.COMPLETED] },
                        { $gte: ['$endedAt', startOfMonth] },
                      ],
                    },
                    '$costMoney',
                    0,
                  ],
                },
              },
            },
          },
        ],
        as: 'callStats',
      },
    },
    {
      $unwind: { path: '$callStats', preserveNullAndEmptyArrays: true },
    },
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        data: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              name: 1,
              phone: 1,
              image: 1,
              status: 1,
              createdAt: 1,
              balanceMinutes: '$wallet.balanceMinutes',
              isDistributor: '$wallet.isDistributor',
              calls: { $ifNull: ['$callStats.callCount', 0] },
              spendMtd: { $ifNull: ['$callStats.spendMtd', 0] },
            },
          },
        ],
        totalCount: [{ $count: 'count' }],
      },
    },
  ];

  const [result] = await User.aggregate(pipeline);
  const customers = (result?.data ?? []).map(
    (c: { phone: string; [key: string]: unknown }) => ({
      ...c,
      country: countryFromPhone(c.phone),
    })
  );
  const total = result?.totalCount?.[0]?.count ?? 0;

  return {
    customers,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getCustomerDetail = async (id: string) => {
  const user = await User.findOne({ _id: id, role: USER_ROLES.USER });
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Customer not found');
  }
  const [wallet, callCount] = await Promise.all([
    Wallet.findOne({ userId: id }),
    Call.countDocuments({ customerId: id }),
  ]);
  return {
    ...user.toObject(),
    country: countryFromPhone(user.phone),
    wallet,
    callCount,
  };
};

const suspendCustomer = async (id: string, reason: string) => {
  const user = await User.findOneAndUpdate(
    { _id: id, role: USER_ROLES.USER },
    { status: USER_STATUS.SUSPENDED, suspensionReason: reason },
    { new: true }
  );
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Customer not found');
  }
  return user;
};

const activateCustomer = async (id: string) => {
  const user = await User.findOneAndUpdate(
    { _id: id, role: USER_ROLES.USER },
    { status: USER_STATUS.ACTIVE, $unset: { suspensionReason: 1 } },
    { new: true }
  );
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Customer not found');
  }
  return user;
};

const markAsDistributor = async (
  id: string,
  payload: { monthlyIssuanceLimit?: number; commissionRatePercent?: number }
) => {
  const user = await User.findOne({ _id: id, role: USER_ROLES.USER });
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Customer not found');
  }
  const wallet = await Wallet.findOneAndUpdate(
    { userId: id },
    {
      isDistributor: true,
      distributorSince: new Date(),
      ...payload,
    },
    { new: true }
  );
  if (!wallet) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Wallet not found');
  }
  return wallet;
};

export const UserService = {
  getUserProfileFromDB,
  updateProfileToDB,
  deleteUser,
  verifyUserPassword,
  getCustomerStats,
  listCustomersAdmin,
  getCustomerDetail,
  suspendCustomer,
  activateCustomer,
  markAsDistributor,
};
