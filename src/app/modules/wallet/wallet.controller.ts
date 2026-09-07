import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { WalletService } from './wallet.service';

const getBalance = catchAsync(async (req, res) => {
  const result = await WalletService.getWalletBalance(req.user.id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Wallet balance retrieved successfully',
    data: result,
  });
});

const getTransactions = catchAsync(async (req, res) => {
  const result = await WalletService.getWalletTransactions(
    req.user.id,
    req.query
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Wallet transactions retrieved successfully',
    data: result,
  });
});

const transfer = catchAsync(async (req, res) => {
  const result = await WalletService.transferMinutes(req.user.id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: `${req.body.minutes} minutes sent successfully`,
    data: result,
  });
});

const adminGrant = catchAsync(async (req, res) => {
  const result = await WalletService.adminGrantMinutes(
    req.user.id,
    req.params.id,
    req.body.minutes
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: `${req.body.minutes} minutes transferred successfully`,
    data: result,
  });
});

const getDistributorReport = catchAsync(async (req, res) => {
  const [stats, weeklyTrend, topPerformer] = await Promise.all([
    WalletService.getDistributorStats(),
    WalletService.getDistributorWeeklyTrend(),
    WalletService.getTopDistributor(),
  ]);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Distributors report retrieved successfully',
    data: { ...stats, weeklyTrend, topPerformer },
  });
});

const getDistributorTransfers = catchAsync(async (req, res) => {
  const result = await WalletService.getDistributorTransferHistory(
    req.query as never
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Transfer history retrieved successfully',
    data: result,
  });
});

export const WalletController = {
  getBalance,
  getTransactions,
  transfer,
  adminGrant,
  getDistributorReport,
  getDistributorTransfers,
};
