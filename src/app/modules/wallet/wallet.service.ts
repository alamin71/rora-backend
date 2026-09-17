import crypto from 'crypto';
import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import { WALLET_TRANSACTION_TYPE } from '../../../enums/wallet';
import { USER_ROLES } from '../../../enums/user';
import { User } from '../user/user.model';
import { Wallet } from './wallet.model';
import { WalletTransaction } from './walletTransaction.model';
import { Transfer } from './transfer.model';
import { TRANSFER_KIND } from '../../../enums/wallet';
import countryFromPhone from '../../../utils/countryFromPhone';

const generateTxRef = () =>
  `TX-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

const getWalletBalance = async (userId: string) => {
  const wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Wallet not found');
  }
  return wallet;
};

const getWalletTransactions = async (
  userId: string,
  query: { page?: number; limit?: number }
) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    WalletTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    WalletTransaction.countDocuments({ userId }),
  ]);

  return {
    transactions,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// Lets the app show the recipient's name on the "Confirm Transfer" screen
// before the sender commits — same match rules as transferMinutes below, so
// a lookup that succeeds here is guaranteed to also succeed there.
const lookupRecipient = async (fromUserId: string, phone: string) => {
  if (!phone) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'phone query param is required');
  }

  const recipient = await User.findOne({
    phone,
    role: USER_ROLES.USER,
  }).select('name phone');
  if (!recipient) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      'No RORA customer found with that phone number'
    );
  }
  if (recipient._id.toString() === fromUserId) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'You cannot transfer minutes to yourself'
    );
  }
  return { name: recipient.name, phone: recipient.phone };
};

// Peer-to-peer minute transfer — the same mechanism a distributor uses to
// re-issue minutes to end customers, since a distributor is just a Wallet
// with isDistributor=true, not a separate transfer kind.
const transferMinutes = async (
  fromUserId: string,
  payload: { toPhone: string; minutes: number }
) => {
  const { toPhone, minutes } = payload;

  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Minutes must be a positive whole number'
    );
  }

  const recipient = await User.findOne({
    phone: toPhone,
    role: USER_ROLES.USER,
  });
  if (!recipient) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      'No RORA customer found with that phone number'
    );
  }
  if (recipient._id.toString() === fromUserId) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'You cannot transfer minutes to yourself'
    );
  }

  // Atomic, balance-guarded debit — fails (returns null) if the balance is
  // insufficient, instead of allowing a race condition to push it negative.
  const senderWallet = await Wallet.findOneAndUpdate(
    { userId: fromUserId, balanceMinutes: { $gte: minutes } },
    { $inc: { balanceMinutes: -minutes } },
    { new: true }
  );
  if (!senderWallet) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Insufficient balance');
  }

  let recipientWallet;
  try {
    recipientWallet = await Wallet.findOneAndUpdate(
      { userId: recipient._id },
      { $inc: { balanceMinutes: minutes } },
      { new: true }
    );
    if (!recipientWallet) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Recipient wallet not found');
    }
  } catch (error) {
    // Compensate the debit so a failed credit never loses minutes
    await Wallet.findOneAndUpdate(
      { userId: fromUserId },
      { $inc: { balanceMinutes: minutes } }
    );
    throw error;
  }

  // If the sender is a distributor, they earn a commission on what they just
  // re-issued — commissionRatePercent applied against the minute count itself
  // (there's no per-minute AED rate on a peer transfer to apply it against,
  // since it isn't tied to a call/destination).
  let commissionEarned: number | undefined;
  if (senderWallet.isDistributor && senderWallet.commissionRatePercent) {
    commissionEarned = Number(
      ((minutes * senderWallet.commissionRatePercent) / 100).toFixed(2)
    );
  }

  const transfer = await Transfer.create({
    fromUserId,
    toUserId: recipient._id,
    minutes,
    kind: TRANSFER_KIND.PEER,
    commissionEarned,
  });

  await WalletTransaction.create([
    {
      userId: fromUserId,
      txRef: generateTxRef(),
      type: WALLET_TRANSACTION_TYPE.TRANSFER_OUT,
      minutes: -minutes,
      relatedTransferId: transfer._id,
      balanceAfter: senderWallet.balanceMinutes,
    },
    {
      userId: recipient._id,
      txRef: generateTxRef(),
      type: WALLET_TRANSACTION_TYPE.TRANSFER_IN,
      minutes,
      relatedTransferId: transfer._id,
      balanceAfter: recipientWallet.balanceMinutes,
    },
  ]);

  return {
    transfer,
    balanceAfter: senderWallet.balanceMinutes,
    recipient: { name: recipient.name, phone: recipient.phone },
  };
};

// Admin grants minutes directly to a customer's wallet — nobody is debited,
// unlike transferMinutes above. Used for the admin dashboard's "Transfer
// Minutes" action on the Customers screen (goodwill credits, manual top-ups).
const adminGrantMinutes = async (
  adminId: string,
  customerId: string,
  minutes: number
) => {
  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Minutes must be a positive whole number'
    );
  }

  const recipient = await User.findOne({
    _id: customerId,
    role: USER_ROLES.USER,
  });
  if (!recipient) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Customer not found');
  }

  const recipientWallet = await Wallet.findOneAndUpdate(
    { userId: customerId },
    { $inc: { balanceMinutes: minutes } },
    { new: true }
  );
  if (!recipientWallet) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Customer wallet not found');
  }

  const transfer = await Transfer.create({
    fromUserId: adminId,
    toUserId: customerId,
    minutes,
    kind: TRANSFER_KIND.ADMIN_RESERVE_GRANT,
  });

  await WalletTransaction.create({
    userId: customerId,
    txRef: generateTxRef(),
    type: WALLET_TRANSACTION_TYPE.TRANSFER_IN,
    minutes,
    relatedTransferId: transfer._id,
    balanceAfter: recipientWallet.balanceMinutes,
  });

  return { transfer, balanceAfter: recipientWallet.balanceMinutes };
};

// ============================================
// Admin — Distributors Report
// ============================================
const getDistributorIds = async () => {
  const wallets = await Wallet.find({ isDistributor: true }).select('userId');
  return wallets.map((w) => w.userId);
};

const getDistributorStats = async () => {
  const distributorIds = await getDistributorIds();

  const [issuedAgg, transferredAgg] = await Promise.all([
    Transfer.aggregate([
      {
        $match: {
          kind: TRANSFER_KIND.ADMIN_RESERVE_GRANT,
          toUserId: { $in: distributorIds },
        },
      },
      { $group: { _id: null, total: { $sum: '$minutes' } } },
    ]),
    Transfer.aggregate([
      {
        $match: {
          kind: TRANSFER_KIND.PEER,
          fromUserId: { $in: distributorIds },
        },
      },
      { $group: { _id: null, total: { $sum: '$minutes' } } },
    ]),
  ]);

  return {
    activeDistributors: distributorIds.length,
    minutesIssued: issuedAgg[0]?.total ?? 0,
    minutesTransferred: transferredAgg[0]?.total ?? 0,
  };
};

// Issued vs transferred minutes, Monday-start weeks, oldest to newest.
const getDistributorWeeklyTrend = async () => {
  const distributorIds = await getDistributorIds();

  const startOfThisWeek = new Date();
  startOfThisWeek.setHours(0, 0, 0, 0);
  const dayIndex = startOfThisWeek.getDay();
  startOfThisWeek.setDate(
    startOfThisWeek.getDate() - (dayIndex === 0 ? 6 : dayIndex - 1)
  );

  const weeks = Array.from({ length: 4 }, (_, i) => {
    const start = new Date(startOfThisWeek);
    start.setDate(start.getDate() - (3 - i) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  });

  return Promise.all(
    weeks.map(async ({ start, end }, idx) => {
      const [issuedAgg, transferredAgg] = await Promise.all([
        Transfer.aggregate([
          {
            $match: {
              kind: TRANSFER_KIND.ADMIN_RESERVE_GRANT,
              toUserId: { $in: distributorIds },
              createdAt: { $gte: start, $lt: end },
            },
          },
          { $group: { _id: null, total: { $sum: '$minutes' } } },
        ]),
        Transfer.aggregate([
          {
            $match: {
              kind: TRANSFER_KIND.PEER,
              fromUserId: { $in: distributorIds },
              createdAt: { $gte: start, $lt: end },
            },
          },
          { $group: { _id: null, total: { $sum: '$minutes' } } },
        ]),
      ]);
      return {
        week: `Week ${idx + 1}`,
        issued: issuedAgg[0]?.total ?? 0,
        transferred: transferredAgg[0]?.total ?? 0,
      };
    })
  );
};

const getTopDistributor = async () => {
  const distributorIds = await getDistributorIds();
  if (!distributorIds.length) return null;

  const [top] = await Transfer.aggregate([
    { $match: { kind: TRANSFER_KIND.PEER, fromUserId: { $in: distributorIds } } },
    {
      $group: {
        _id: '$fromUserId',
        totalMinutesTransferred: { $sum: '$minutes' },
        totalCommission: { $sum: { $ifNull: ['$commissionEarned', 0] } },
        lastActivity: { $max: '$createdAt' },
      },
    },
    { $sort: { totalMinutesTransferred: -1 } },
    { $limit: 1 },
  ]);
  if (!top) return null;

  const user = await User.findById(top._id);
  if (!user) return null;

  return {
    id: user._id,
    name: user.name,
    country: countryFromPhone(user.phone),
    totalMinutesTransferred: top.totalMinutesTransferred,
    commission: Number(top.totalCommission.toFixed(2)),
    lastActivity: top.lastActivity,
  };
};

const getDistributorTransferHistory = async (query: {
  page?: number;
  limit?: number;
}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));

  const distributorIds = await getDistributorIds();
  const filter = {
    kind: TRANSFER_KIND.PEER,
    fromUserId: { $in: distributorIds },
  };

  const [transfers, total] = await Promise.all([
    Transfer.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('fromUserId', 'name')
      .populate('toUserId', 'name'),
    Transfer.countDocuments(filter),
  ]);

  const balanceEntries = await WalletTransaction.find({
    relatedTransferId: { $in: transfers.map((t) => t._id) },
    type: WALLET_TRANSACTION_TYPE.TRANSFER_IN,
  }).select('relatedTransferId balanceAfter');
  const balanceByTransferId = new Map(
    balanceEntries.map((e) => [e.relatedTransferId!.toString(), e.balanceAfter])
  );

  const data = transfers.map((t) => ({
    ...t.toObject(),
    balanceAfter: balanceByTransferId.get(t._id.toString()) ?? null,
  }));

  return {
    transfers: data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const WalletService = {
  getWalletBalance,
  getWalletTransactions,
  lookupRecipient,
  transferMinutes,
  adminGrantMinutes,
  getDistributorStats,
  getDistributorWeeklyTrend,
  getTopDistributor,
  getDistributorTransferHistory,
};
