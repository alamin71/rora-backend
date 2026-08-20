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

  const transfer = await Transfer.create({
    fromUserId,
    toUserId: recipient._id,
    minutes,
    kind: TRANSFER_KIND.PEER,
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

export const WalletService = {
  getWalletBalance,
  getWalletTransactions,
  transferMinutes,
};
