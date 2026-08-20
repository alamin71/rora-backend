export type IVerifyOtp = {
  phone: string;
  oneTimeCode: number;
};

export type ILoginData = {
  phone: string;
  password: string;
};

export type IAuthResetPassword = {
  newPassword: string;
  confirmPassword: string;
};

export type IChangePassword = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};
