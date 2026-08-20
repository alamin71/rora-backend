import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import config from '../config';
import AppError from '../errors/AppError';
import { StatusCodes } from 'http-status-codes';

// Initialized lazily, on first upload — not at import time — so the server can
// still boot when Firebase credentials aren't configured yet (e.g. local dev).
const getBucket = () => {
  if (!getApps().length) {
    const { project_id, client_email, private_key, storage_bucket } =
      config.firebase;
    if (!project_id || !client_email || !private_key || !storage_bucket) {
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Firebase Storage is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY and FIREBASE_STORAGE_BUCKET.'
      );
    }
    initializeApp({
      credential: cert({
        projectId: project_id,
        clientEmail: client_email,
        privateKey: private_key.replace(/\\n/g, '\n'),
      }),
      storageBucket: storage_bucket,
    });
  }
  return getStorage().bucket();
};

// Upload a file to Firebase Storage
export const uploadFile = async (
  file: Express.Multer.File,
  folder: string = 'uploads'
): Promise<string> => {
  const bucket = getBucket();
  const fileName = `${folder}/${Date.now()}-${file.originalname.replace(
    /\s+/g,
    '-'
  )}`;

  const blob = bucket.file(fileName);
  await blob.save(file.buffer, {
    contentType: file.mimetype,
    public: true,
  });

  return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
};

// Upload multiple files to Firebase Storage
export const uploadMultipleFiles = async (
  files: Express.Multer.File[],
  folder: string = 'uploads'
): Promise<string[]> => {
  return Promise.all(files.map((file) => uploadFile(file, folder)));
};

export const storageHelper = {
  uploadFile,
  uploadMultipleFiles,
};
