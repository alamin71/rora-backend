const generateOTP = (length: number = 4): string => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const otp = Math.floor(Math.random() * (max - min + 1) + min);
  return otp.toString();
};

export default generateOTP;
