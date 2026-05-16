export const LIMITS = {
  emailMax: 254,
  passwordMin: 6,
  passwordMax: 128,
  nameMax: 200,
  searchMax: 120,
} as const;

const INVALID_NAME_CHARS = /[\\/\x00-\x1f\x7f"<>:|?*]/;

export function validateName(name: string): string | null {
  const v = name.trim();
  if (!v) return 'Имя не может быть пустым';
  if (v.length > LIMITS.nameMax) return `Имя длиннее ${LIMITS.nameMax} символов`;
  if (v === '.' || v === '..') return 'Недопустимое имя';
  if (INVALID_NAME_CHARS.test(v)) return 'Имя содержит недопустимые символы: \\ / < > : | ? * "';
  return null;
}
