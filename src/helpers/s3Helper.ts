import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import config from '../config';

// S3 Client Configuration
// Without an explicit requestHandler timeout, a bad region/bucket/blocked
// network can leave uploadToS3() hanging for several minutes instead of
// failing fast — the SDK's default is no timeout at all.
const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.access_key_id as string,
    secretAccessKey: config.aws.secret_access_key as string,
  },
  maxAttempts: 2,
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 5000,
    requestTimeout: 15000,
  }),
});

// Upload file to S3
export const uploadToS3 = async (
  file: Express.Multer.File,
  folder: string = 'uploads'
): Promise<string> => {
  const fileName = `${folder}/${Date.now()}-${file.originalname.replace(
    /\s+/g,
    '-'
  )}`;

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: config.aws.s3_bucket_name as string,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read', // Make file publicly accessible
    },
  });

  await upload.done();

  // Return the S3 URL
  return `https://${config.aws.s3_bucket_name}.s3.${config.aws.region}.amazonaws.com/${fileName}`;
};

// Upload multiple files to S3
export const uploadMultipleToS3 = async (
  files: Express.Multer.File[],
  folder: string = 'uploads'
): Promise<string[]> => {
  const uploadPromises = files.map((file) => uploadToS3(file, folder));
  return await Promise.all(uploadPromises);
};

export const s3Helper = {
  uploadToS3,
  uploadMultipleToS3,
};
