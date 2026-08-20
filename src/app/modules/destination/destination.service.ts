import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import { DESTINATION_STATUS } from '../../../enums/destination';
import { Destination } from './destination.model';
import { ExchangeRate } from './exchangeRate.model';
import { IDestination } from './destination.interface';

// Customer-facing — active destinations only, no operator payout / margin exposed.
// Optionally converts the AED rate into the customer's display currency.
const listActiveDestinations = async (currency?: string) => {
  const destinations = await Destination.find({
    status: DESTINATION_STATUS.ACTIVE,
  }).select('name prefix customerRatePerMin');

  if (!currency) {
    return destinations.map((d) => ({
      id: d._id,
      name: d.name,
      prefix: d.prefix,
      customerRatePerMin: d.customerRatePerMin,
      currency: 'AED',
    }));
  }

  const exchangeRate = await ExchangeRate.findOne({
    currency: currency.toUpperCase(),
  });
  if (!exchangeRate) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `No exchange rate configured for ${currency.toUpperCase()}`
    );
  }

  return destinations.map((d) => ({
    id: d._id,
    name: d.name,
    prefix: d.prefix,
    customerRatePerMin: Number(
      (d.customerRatePerMin * exchangeRate.rate).toFixed(2)
    ),
    currency: exchangeRate.currency,
  }));
};

// Admin — every destination, active or disabled, with margin computed on read.
const listAllDestinationsForAdmin = async () => {
  const destinations = await Destination.find().sort({ createdAt: -1 });
  return destinations.map((d) => ({
    ...d.toObject(),
    marginPerMin: Number(
      (d.customerRatePerMin - d.operatorPayoutPerMin).toFixed(4)
    ),
  }));
};

const createDestination = async (payload: IDestination) => {
  const existing = await Destination.findOne({ prefix: payload.prefix });
  if (existing) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'A destination with this prefix already exists'
    );
  }
  return Destination.create(payload);
};

const updateDestination = async (
  id: string,
  payload: Partial<IDestination>
) => {
  delete payload.status; // status has its own dedicated endpoint

  const updated = await Destination.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  if (!updated) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Destination not found');
  }
  return updated;
};

const updateDestinationStatus = async (
  id: string,
  status: DESTINATION_STATUS
) => {
  const updated = await Destination.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );
  if (!updated) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Destination not found');
  }
  return updated;
};

// In-progress and past calls keep their own rate snapshot (captured at call
// time in the Call module), so deleting a destination doesn't touch them —
// it only stops it from being offered for new calls.
const deleteDestination = async (id: string) => {
  const deleted = await Destination.findByIdAndDelete(id);
  if (!deleted) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Destination not found');
  }
};

const listExchangeRates = async () => {
  return ExchangeRate.find().sort({ currency: 1 });
};

const upsertExchangeRate = async (
  currency: string,
  rate: number,
  adminId: string
) => {
  return ExchangeRate.findOneAndUpdate(
    { currency: currency.toUpperCase() },
    { rate, updatedBy: adminId },
    { new: true, upsert: true, runValidators: true }
  );
};

export const DestinationService = {
  listActiveDestinations,
  listAllDestinationsForAdmin,
  createDestination,
  updateDestination,
  updateDestinationStatus,
  deleteDestination,
  listExchangeRates,
  upsertExchangeRate,
};
