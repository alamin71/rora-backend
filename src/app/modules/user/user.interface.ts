import { Model } from 'mongoose';
import { USER_ROLES, USER_STATUS } from '../../../enums/user';
export type IUser = {
  name: string;
  role: USER_ROLES;
  email?: string;
  password: string;
  phone: string;
  image?: string;
  isDeleted: boolean;
  stripeCustomerId?: string;
  status: USER_STATUS;
  suspensionReason?: string;
  verified: boolean;
  notificationPrefs: {
    callUpdates: boolean;
    lowBalanceAlerts: boolean;
    rechargeConfirmations: boolean;
  };
  authentication?: {
    isResetPassword: boolean;
    oneTimeCode: number | null;
    expireAt: Date | null;
    pendingEmail?: string;
    emailChangeOtp?: number | null;
    emailChangeExpireAt?: Date | null;
  };
};

export type UserModel = {
  isExistUserById(id: string): Promise<IUser | null>;
  isExistUserByEmail(email: string): Promise<IUser | null>;
  isExistUserByPhone(phone: string): Promise<IUser | null>;
  isMatchPassword(password: string, hashPassword: string): boolean;
} & Model<IUser>;
