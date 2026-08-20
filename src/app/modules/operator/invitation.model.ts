import { model, Schema } from 'mongoose';
import { INVITATION_STATUS } from '../../../enums/operator';
import { IInvitation, InvitationModel } from './invitation.interface';

const invitationSchema = new Schema<IInvitation, InvitationModel>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(INVITATION_STATUS),
      default: INVITATION_STATUS.PENDING,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    usedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

export const Invitation = model<IInvitation, InvitationModel>(
  'Invitation',
  invitationSchema
);
