/**
 * KenaX BD Email Format Validator
 * 
 * Supports:
 * - General user/customer Gmail format: yourname@gmail.com
 * - Super Admin email format: sadikrtx3060@gmail.com
 * - Standard RFC-compliant domain emails
 */

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  return clean === 'sadikrtx3060@gmail.com';
}

export function isGmailFormat(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  return /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(clean);
}

export function isValidEmailFormat(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();

  // Super Admin email is always valid
  if (isSuperAdminEmail(clean)) {
    return true;
  }

  // Standard email format: name@domain.tld (e.g. yourname@gmail.com)
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(clean);
}

export function getEmailValidationError(email: string | null | undefined): string | null {
  if (!email || !email.trim()) {
    return 'ইমেইল অ্যাড্রেস প্রদান করুন (যেমন: yourname@gmail.com)';
  }
  const clean = email.trim().toLowerCase();
  if (isSuperAdminEmail(clean)) {
    return null;
  }
  if (!isValidEmailFormat(clean)) {
    return 'অনুগ্রহ করে সঠিক ইমেইল দিন (যেমন: yourname@gmail.com)';
  }
  return null;
}
