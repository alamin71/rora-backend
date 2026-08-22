// Combines a separately-collected country code and national number into the
// single E.164-ish string ("+201001234567") stored on the User model and
// used everywhere else in the app (SMS, lookups, JWT payloads).
const normalizePhone = (countryCode: string, phone: string): string => {
  const cc = countryCode.replace(/\D/g, '');
  const national = phone.replace(/\D/g, '').replace(/^0+/, '');
  return `+${cc}${national}`;
};

export default normalizePhone;
