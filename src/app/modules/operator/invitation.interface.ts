import { Model, Types } from 'mongoose';
import { INVITATION_STATUS } from '../../../enums/operator';

export type IInvitation = {
  code: string;
  name: string;
  phone: string;
  city: string;
  status: INVITATION_STATUS;
  invitedBy: Types.ObjectId;
  usedByUserId?: Types.ObjectId;
  expiresAt: Date;
};

export type InvitationModel = Model<IInvitation>;
