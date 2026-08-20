import crypto from 'crypto';
import { StatusCodes } from 'http-status-codes';
import { Secret } from 'jsonwebtoken';
import AppError from '../../../errors/AppError';
import config from '../../../config';
import { USER_ROLES, USER_STATUS } from '../../../enums/user';
import { INVITATION_STATUS } from '../../../enums/operator';
import { jwtHelper } from '../../../helpers/jwtHelper';
import { smsHelper } from '../../../helpers/smsHelper';
import generateOTP from '../../../utils/generateOTP';
import { User } from '../user/user.model';
import { Invitation } from './invitation.model';
import { OperatorProfile } from './operatorProfile.model';

const OTP_TTL_MS = 5 * 60000;
const OTP_TOKEN_TTL = '10m';
const INVITATION_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

// XXXX-XXX-XXXX — excludes visually ambiguous characters (0/O, 1/I)
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generateInvitationCode = () => {
  const randomSegment = (length: number) =>
    Array.from(crypto.randomFillSync(new Uint8Array(length)))
      .map((byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length])
      .join('');
  return `${randomSegment(4)}-${randomSegment(3)}-${randomSegment(4)}`;
};

const inviteOperator = async (
  payload: { name: string; phone: string; city: string },
  invitedBy: string
) => {
  const existingUser = await User.findOne({ phone: payload.phone });
  if (existingUser) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'A user with this phone number already exists'
    );
  }

  const existingInvite = await Invitation.findOne({
    phone: payload.phone,
    status: INVITATION_STATUS.PENDING,
  });
  if (existingInvite) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'This phone number already has a pending invitation'
    );
  }

  const invitation = await Invitation.create({
    ...payload,
    code: generateInvitationCode(),
    invitedBy,
    expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
  });

  await smsHelper.sendSms(
    payload.phone,
    `You've been invited to join RORA as an operator. Enter this code in the app to get started: ${invitation.code} (valid 48 hours).`
  );

  return invitation;
};

const validateInvitation = async (code: string) => {
  const invitation = await Invitation.findOne({ code: code.toUpperCase() });
  if (!invitation) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Invalid invitation code');
  }
  if (invitation.status !== INVITATION_STATUS.PENDING) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `This invitation has already been ${invitation.status}`
    );
  }
  if (invitation.expiresAt < new Date()) {
    invitation.status = INVITATION_STATUS.EXPIRED;
    await invitation.save();
    throw new AppError(StatusCodes.BAD_REQUEST, 'This invitation has expired');
  }

  return {
    name: invitation.name,
    phone: invitation.phone,
    city: invitation.city,
  };
};

const operatorSignup = async (payload: {
  code: string;
  name: string;
  phone: string;
  email?: string;
  city: string;
  password: string;
  phoneNumbers?: string[];
  selfieUrl?: string;
}) => {
  const { code, phone } = payload;

  const invitation = await Invitation.findOne({ code: code.toUpperCase() });
  if (!invitation || invitation.status !== INVITATION_STATUS.PENDING) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Invalid or already-used invitation code'
    );
  }
  if (invitation.expiresAt < new Date()) {
    invitation.status = INVITATION_STATUS.EXPIRED;
    await invitation.save();
    throw new AppError(StatusCodes.BAD_REQUEST, 'This invitation has expired');
  }
  // The invite was addressed to a specific phone by the admin — redeeming it
  // with a different number would let a leaked code be reused by anyone.
  if (invitation.phone !== phone) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'This invitation was issued for a different phone number'
    );
  }

  const existingUser = await User.findOne({ phone });
  if (existingUser) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'An account with this phone number already exists'
    );
  }

  // Stays pending_verification until an admin confirms identity/bank details —
  // see the Operator Agreement copy in the app's onboarding screen.
  const user = await User.create({
    name: payload.name,
    phone,
    email: payload.email,
    password: payload.password,
    role: USER_ROLES.OPERATOR,
    status: USER_STATUS.PENDING_VERIFICATION,
  });

  await OperatorProfile.create({
    userId: user._id,
    city: payload.city,
    phoneNumbers: payload.phoneNumbers || [],
    selfieUrl: payload.selfieUrl,
  });

  invitation.status = INVITATION_STATUS.USED;
  invitation.usedByUserId = user._id;
  await invitation.save();

  const otp = generateOTP(4);
  smsHelper.sendOtpSms(phone, otp);
  await User.findOneAndUpdate(
    { _id: user._id },
    {
      $set: {
        authentication: {
          oneTimeCode: otp,
          expireAt: new Date(Date.now() + OTP_TTL_MS),
        },
      },
    }
  );

  const signupToken = jwtHelper.createToken(
    { phone },
    config.jwt.jwt_secret as Secret,
    OTP_TOKEN_TTL
  );

  return { otp, signupToken };
};

// Admin confirms identity/bank details after onboarding — the final gate
// before an operator can log in and start taking calls.
const verifyOperator = async (userId: string) => {
  const user = await User.findOne({ _id: userId, role: USER_ROLES.OPERATOR });
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Operator not found');
  }
  if (user.status !== USER_STATUS.PENDING_VERIFICATION) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `Operator is already ${user.status}`
    );
  }

  return User.findByIdAndUpdate(
    userId,
    { status: USER_STATUS.ACTIVE },
    { new: true }
  );
};

export const OperatorService = {
  inviteOperator,
  validateInvitation,
  operatorSignup,
  verifyOperator,
};
