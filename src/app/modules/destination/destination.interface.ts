import { Model, Types } from 'mongoose';
import { DESTINATION_STATUS } from '../../../enums/destination';

export type IDestination = {
  name: string;
  prefix: string;
  customerRatePerMin: number;
  operatorPayoutPerMin: number;
  status: DESTINATION_STATUS;
};

export type DestinationModel = Model<IDestination>;

export type IExchangeRate = {
  currency: string;
  rate: number;
  updatedBy?: Types.ObjectId;
};

export type ExchangeRateModel = Model<IExchangeRate>;
