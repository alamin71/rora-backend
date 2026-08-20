import { model, Schema } from 'mongoose';

export const POLICY_PAGE_TYPES = [
  'privacy-policy',
  'terms-conditions',
  'about-app',
] as const;

export type PolicyPageType = (typeof POLICY_PAGE_TYPES)[number];

export interface IPolicyPage {
  type: PolicyPageType;
  title: string;
  content: string;
}

const policyPageSchema = new Schema<IPolicyPage>(
  {
    type: {
      type: String,
      enum: POLICY_PAGE_TYPES,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const PolicyPage = model<IPolicyPage>('PolicyPage', policyPageSchema);
