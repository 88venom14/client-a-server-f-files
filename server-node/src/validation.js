const LIMITS = {
  emailMin: 5,
  emailMax: 254,
  passwordMin: 6,
  passwordMax: 128,
  nameMax: 200,
  searchMax: 120,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID_NAME_CHARS = /[\\/\x00-\x1f\x7f"<>:|?*]/;

function validateEmail(input) {
  if (typeof input !== 'string') return 'email обязателен';
  const v = input.trim();
  if (v.length < LIMITS.emailMin) return 'email слишком короткий';
  if (v.length > LIMITS.emailMax) return `email длиннее ${LIMITS.emailMax} символов`;
  if (!EMAIL_RE.test(v)) return 'email невалиден';
  return null;
}

function validatePassword(input) {
  if (typeof input !== 'string') return 'пароль обязателен';
  if (input.length < LIMITS.passwordMin) return `пароль короче ${LIMITS.passwordMin} символов`;
  if (input.length > LIMITS.passwordMax) return `пароль длиннее ${LIMITS.passwordMax} символов`;
  return null;
}

function validateName(input) {
  if (typeof input !== 'string') return 'имя обязательно';
  const v = input.trim();
  if (!v) return 'имя не может быть пустым';
  if (v.length > LIMITS.nameMax) return `имя длиннее ${LIMITS.nameMax} символов`;
  if (v === '.' || v === '..') return 'недопустимое имя';
  if (INVALID_NAME_CHARS.test(v)) return 'имя содержит недопустимые символы';
  return null;
}

function clamp(s, max) {
  if (typeof s !== 'string') return '';
  return s.length > max ? s.slice(0, max) : s;
}

module.exports = {
  LIMITS,
  validateEmail,
  validatePassword,
  validateName,
  clamp,
};
