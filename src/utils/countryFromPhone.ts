// No stored country field on User — derived from the phone's dialing code for
// display purposes only (admin customer/distributor screens), best-effort for
// the markets this product actually serves.
const PHONE_COUNTRY_PREFIXES: [string, string][] = [
  ['+20', 'Egypt'],
  ['+971', 'UAE'],
  ['+249', 'Sudan'],
  ['+291', 'Eritrea'],
  ['+966', 'Saudi Arabia'],
];

const countryFromPhone = (phone: string): string => {
  const match = PHONE_COUNTRY_PREFIXES.find(([prefix]) =>
    phone.startsWith(prefix)
  );
  return match ? match[1] : 'Other';
};

export default countryFromPhone;
