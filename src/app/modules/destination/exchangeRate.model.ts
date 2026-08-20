import { model, Schema } from 'mongoose';
import { ExchangeRateModel, IExchangeRate } from './destination.interface';

const exchangeRateSchema = new Schema<IExchangeRate, ExchangeRateModel>(
  {
    currency: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

export const ExchangeRate = model<IExchangeRate, ExchangeRateModel>(
  'ExchangeRate',
  exchangeRateSchema
);
