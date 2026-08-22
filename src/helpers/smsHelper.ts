import config from '../config';
import { errorLogger, logger } from '../shared/logger';

const sendSms = async (to: string, body: string): Promise<void> => {
  try {
    const { accountSid, authToken, phoneNumber } = config.twilio;
    if (!accountSid || !authToken || !phoneNumber) {
      logger.warn('Twilio is not configured — SMS not sent');
      return;
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const params = new URLSearchParams({
      To: to,
      From: phoneNumber,
      Body: body,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.message || 'Twilio SMS request failed');
    }

    logger.info('SMS sent successfully', to);
  } catch (error) {
    errorLogger.error('SMS', error);
  }
};

const sendOtpSms = async (to: string, otp: string): Promise<void> => {
  await sendSms(to, `Your RORA verification code is ${otp}. It expires in 5 minutes.`);
};

// Twilio isn't configured yet — until real credentials are added, callers can
// use this to echo the OTP back in the API response for manual testing.
const isConfigured = (): boolean => {
  const { accountSid, authToken, phoneNumber } = config.twilio;
  return Boolean(accountSid && authToken && phoneNumber);
};

export const smsHelper = { sendSms, sendOtpSms, isConfigured };
