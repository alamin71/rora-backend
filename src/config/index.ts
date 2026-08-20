import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
  ip_address: process.env.IP_ADDRESS,
  frontend_url: process.env.FRONTEND_URL,
  backend_url: process.env.BACKEND_URL,
  reset_pass_expire_time: process.env.RESET_TOKEN_EXPIRE_TIME,
  database_url: process.env.DATABASE_URL,
  node_env: process.env.NODE_ENV,
  port: process.env.PORT,

  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  socket_port: process.env.SOCKET_PORT,
  allowed_origins: process.env.ALLOWED_ORIGINS,
  jwt: {
    jwt_secret: process.env.JWT_SECRET,
    jwt_expire_in: process.env.JWT_EXPIRE_IN,
    jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
    jwt_refresh_expire_in: process.env.JWT_REFRESH_EXPIRE_IN,
  },

  email: {
    email_header: process.env.EMAIL_HEADER_NAME,
    from: process.env.EMAIL_FROM,
    user: process.env.EMAIL_USER,
    port: process.env.EMAIL_PORT,
    host: process.env.EMAIL_HOST,
    pass: process.env.EMAIL_PASS,
  },
  unifonic: {
    appSid: process.env.UNIFONIC_APP_SID || '',
    senderId: process.env.UNIFONIC_SENDER_ID || '',
  },
  stripe: {
    stripe_secret_key: process.env.STRIPE_SECRET_KEY,
    paymentSuccess_url: process.env.STRIPE_PAYMENT_SUCCESS_URL,
    stripe_webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
    stripe_webhook_url: process.env.STRIPE_WEBHOOK_URL,
    stripe_product_id: process.env.STRIPE_PRODUCT_ID,
  },
  super_admin: {
    phone: process.env.SUPER_ADMIN_PHONE,
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD,
  },
  firebase: {
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY,
    storage_bucket: process.env.FIREBASE_STORAGE_BUCKET,
  },
};
