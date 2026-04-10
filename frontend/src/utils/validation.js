export const NAME_REGEX = /^[a-zA-ZñÑ\s\-]+$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const NAME_ERROR_MESSAGE = 'Please provide a valid name. Only letters, spaces, and hyphens (-) are allowed. Numbers and special characters are not permitted.';
export const EMAIL_ERROR_MESSAGE = 'Please provide a valid email address (e.g., name@example.com).';
export const PHONE_ERROR_MESSAGE = 'Please provide a valid phone number.';

export const isValidName = (value = '') => {
    const trimmed = String(value || '').trim();
    return !!trimmed && NAME_REGEX.test(trimmed);
};

export const isValidEmail = (value = '') => {
    const trimmed = String(value || '').trim();
    return !!trimmed && EMAIL_REGEX.test(trimmed);
};
