import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import config from '../config';
import { errorLogger, logger } from '../shared/logger';

// Lazily initialized, and never throws when credentials are missing — the
// broadcast still records in the Notification collection, it just can't
// actually deliver until real FIREBASE_* values replace the placeholders.
const getMessagingClient = () => {
  if (!getApps().length) {
    const { project_id, client_email, private_key } = config.firebase;
    if (!project_id || !client_email || !private_key) {
      return null;
    }
    initializeApp({
      credential: cert({
        projectId: project_id,
        clientEmail: client_email,
        privateKey: private_key.replace(/\\n/g, '\n'),
      }),
    });
  }
  return getMessaging();
};

const sendPushToTokens = async (
  tokens: string[],
  title: string,
  body: string
): Promise<{ successCount: number; failureCount: number }> => {
  if (!tokens.length) {
    return { successCount: 0, failureCount: 0 };
  }

  const messaging = getMessagingClient();
  if (!messaging) {
    logger.warn('Firebase is not configured — push notification not sent');
    return { successCount: 0, failureCount: tokens.length };
  }

  try {
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
    });
    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    errorLogger.error('FCM', error);
    return { successCount: 0, failureCount: tokens.length };
  }
};

export const fcmHelper = { sendPushToTokens };
