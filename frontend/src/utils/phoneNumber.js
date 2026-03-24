export const digitsOnly = (value = '') => String(value).replace(/\D/g, '');

export const normalizePHPhone = (value = '') => {
  const digits = digitsOnly(value);
  if (!digits) return '';

  if (digits.startsWith('639') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('09') && digits.length === 11) return `+63${digits.slice(1)}`;
  if (digits.startsWith('9') && digits.length === 10) return `+63${digits}`;

  return null;
};

export const formatPHPhoneLocal = (value = '') => {
  const normalized = normalizePHPhone(value);
  const digits = normalized ? normalized.slice(3) : digitsOnly(value).replace(/^63/, '').replace(/^0/, '');

  if (!digits) return '';

  const mobile = digits.slice(0, 10);
  if (mobile.length <= 4) return `0${mobile}`;
  if (mobile.length <= 7) return `0${mobile.slice(0, 4)} ${mobile.slice(4)}`;
  return `0${mobile.slice(0, 4)} ${mobile.slice(4, 7)} ${mobile.slice(7, 10)}`.trim();
};
