export interface Country {
  name: string;
  /** ISO 3166-1 alpha-2. */
  iso2: string;
  /** E.164 calling code, without the leading `+`. */
  dialCode: string;
}

/** Countries + calling codes for the contact form's country/phone fields. */
export const COUNTRIES: Country[] = [
  { name: 'United States', iso2: 'US', dialCode: '1' },
  { name: 'Canada', iso2: 'CA', dialCode: '1' },
  { name: 'United Kingdom', iso2: 'GB', dialCode: '44' },
  { name: 'India', iso2: 'IN', dialCode: '91' },
  { name: 'Australia', iso2: 'AU', dialCode: '61' },
  { name: 'Germany', iso2: 'DE', dialCode: '49' },
  { name: 'France', iso2: 'FR', dialCode: '33' },
  { name: 'Ireland', iso2: 'IE', dialCode: '353' },
  { name: 'Netherlands', iso2: 'NL', dialCode: '31' },
  { name: 'Belgium', iso2: 'BE', dialCode: '32' },
  { name: 'Switzerland', iso2: 'CH', dialCode: '41' },
  { name: 'Austria', iso2: 'AT', dialCode: '43' },
  { name: 'Spain', iso2: 'ES', dialCode: '34' },
  { name: 'Portugal', iso2: 'PT', dialCode: '351' },
  { name: 'Italy', iso2: 'IT', dialCode: '39' },
  { name: 'Sweden', iso2: 'SE', dialCode: '46' },
  { name: 'Norway', iso2: 'NO', dialCode: '47' },
  { name: 'Denmark', iso2: 'DK', dialCode: '45' },
  { name: 'Finland', iso2: 'FI', dialCode: '358' },
  { name: 'Poland', iso2: 'PL', dialCode: '48' },
  { name: 'Czech Republic', iso2: 'CZ', dialCode: '420' },
  { name: 'Romania', iso2: 'RO', dialCode: '40' },
  { name: 'Hungary', iso2: 'HU', dialCode: '36' },
  { name: 'Greece', iso2: 'GR', dialCode: '30' },
  { name: 'Ukraine', iso2: 'UA', dialCode: '380' },
  { name: 'Russia', iso2: 'RU', dialCode: '7' },
  { name: 'Turkey', iso2: 'TR', dialCode: '90' },
  { name: 'Israel', iso2: 'IL', dialCode: '972' },
  { name: 'United Arab Emirates', iso2: 'AE', dialCode: '971' },
  { name: 'Saudi Arabia', iso2: 'SA', dialCode: '966' },
  { name: 'Qatar', iso2: 'QA', dialCode: '974' },
  { name: 'Egypt', iso2: 'EG', dialCode: '20' },
  { name: 'South Africa', iso2: 'ZA', dialCode: '27' },
  { name: 'Nigeria', iso2: 'NG', dialCode: '234' },
  { name: 'Kenya', iso2: 'KE', dialCode: '254' },
  { name: 'China', iso2: 'CN', dialCode: '86' },
  { name: 'Japan', iso2: 'JP', dialCode: '81' },
  { name: 'South Korea', iso2: 'KR', dialCode: '82' },
  { name: 'Singapore', iso2: 'SG', dialCode: '65' },
  { name: 'Malaysia', iso2: 'MY', dialCode: '60' },
  { name: 'Indonesia', iso2: 'ID', dialCode: '62' },
  { name: 'Philippines', iso2: 'PH', dialCode: '63' },
  { name: 'Vietnam', iso2: 'VN', dialCode: '84' },
  { name: 'Thailand', iso2: 'TH', dialCode: '66' },
  { name: 'Pakistan', iso2: 'PK', dialCode: '92' },
  { name: 'Bangladesh', iso2: 'BD', dialCode: '880' },
  { name: 'Sri Lanka', iso2: 'LK', dialCode: '94' },
  { name: 'New Zealand', iso2: 'NZ', dialCode: '64' },
  { name: 'Mexico', iso2: 'MX', dialCode: '52' },
  { name: 'Brazil', iso2: 'BR', dialCode: '55' },
  { name: 'Argentina', iso2: 'AR', dialCode: '54' },
  { name: 'Chile', iso2: 'CL', dialCode: '56' },
  { name: 'Colombia', iso2: 'CO', dialCode: '57' },
  { name: 'Peru', iso2: 'PE', dialCode: '51' },
];

/** Dial code for a country name, e.g. `dialCodeForCountry('India')` → `'91'`. */
export function dialCodeForCountry(name: string | undefined | null): string | undefined {
  return COUNTRIES.find((c) => c.name === name)?.dialCode;
}
