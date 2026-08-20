import config from '../config';
import { errorLogger, logger } from '../shared/logger';

const UNIFONIC_SEND_URL = 'https://el.cloud.unifonic.com/rest/SMS/messages';

const sendSms = async (to: string, body: string): Promise<void> => {
  try {
    const params = new URLSearchParams({
      AppSid: config.unifonic.appSid,
      SenderID: config.unifonic.senderId,
      Body: body,
      Recipient: to,
      responseType: 'JSON',
    });

    const response = await fetch(UNIFONIC_SEND_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const result = await response.json();
    if (!response.ok || result?.success === false) {
      throw new Error(result?.message || 'Unifonic SMS request failed');
    }

    logger.info('SMS sent successfully', to);
  } catch (error) {
    errorLogger.error('SMS', error);
  }
};

const sendOtpSms = async (to: string, otp: string): Promise<void> => {
  await sendSms(to, `Your RORA verification code is ${otp}. It expires in 5 minutes.`);
};

export const smsHelper = { sendSms, sendOtpSms };
