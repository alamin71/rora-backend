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

export const WalletController = {
  getBalance,
  getTransactions,
  transfer,
};
