import { IEmailChangeOtp } from '../types/emailTemplate';

const LOGO_URL =
  'https://bradmarquis-bucket.s3.us-east-1.amazonaws.com/brand_logo.png';

// Auth OTP (signup, login, password reset) goes out over SMS via smsHelper —
// this is the one email flow RORA actually uses: an admin changing their email.
const emailChangeOtp = (values: IEmailChangeOtp) => {
  const data = {
    to: values.newEmail,
    subject: 'Email change verification OTP',
    html: `<body style="font-family: Arial, sans-serif; background-color: #f9f9f9; margin: 50px; padding: 20px; color: #555;">
    <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); text-align: center;">
        <img src="${LOGO_URL}" alt="Logo" style="display: block; margin: 0 auto 20px; width:150px" />
        <h2 style="color: #277E16; font-size: 24px; margin-bottom: 20px;">Email Change Verification</h2>
        <div style="text-align: center;">
            <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">Hi ${values.name},</p>
            <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">Use this OTP to verify your new email address:</p>
            <div style="background-color: #277E16; width: 120px; padding: 10px; text-align: center; border-radius: 8px; color: #fff; font-size: 25px; letter-spacing: 2px; margin: 20px auto;">${values.otp}</div>
            <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">This OTP is valid for 5 minutes.</p>
            <p style="color: #777; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">If you did not request this email change, please ignore this email and your account will remain unchanged.</p>
        </div>
    </div>
</body>`,
  };
  return data;
};

export const emailTemplate = {
  emailChangeOtp,
};
