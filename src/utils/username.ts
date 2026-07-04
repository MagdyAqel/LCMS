const INTERNAL_AUTH_DOMAIN = "lcms.test";

export function normalizeUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._-]/g, "");
}

export function isEmailIdentifier(value: string) {
  return value.includes("@");
}

export function usernameToEmail(username: string) {
  const normalized = normalizeUsername(username);

  if (!normalized) {
    throw new Error("اسم المستخدم مطلوب.");
  }

  return `${normalized}@${INTERNAL_AUTH_DOMAIN}`;
}

export function identifierToAuthEmail(identifier: string) {
  const trimmed = identifier.trim();
  return isEmailIdentifier(trimmed) ? trimmed : usernameToEmail(trimmed);
}

export function isValidUsername(username: string) {
  const normalized = normalizeUsername(username);
  return normalized === username.trim().toLowerCase() && normalized.length >= 3;
}
