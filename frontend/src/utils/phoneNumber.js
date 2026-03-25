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
  const digits = normalized
    ? `0${normalized.slice(3)}`
    : digitsOnly(value).replace(/^63/, '0').replace(/^9/, '09');

  if (!digits) return '';

  const mobile = digits.slice(0, 11);
  if (mobile.length <= 4) return mobile;
  if (mobile.length <= 7) return `${mobile.slice(0, 4)} ${mobile.slice(4)}`.trim();
  return `${mobile.slice(0, 4)} ${mobile.slice(4, 7)} ${mobile.slice(7, 11)}`.trim();
};
