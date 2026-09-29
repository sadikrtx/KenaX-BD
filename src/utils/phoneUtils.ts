/**
 * KenaX BD — Global Bangladesh Mobile Number Standardization & Validation Utility
 *
 * Enforces strict Bangladeshi 11-digit mobile numbers:
 * - Must contain exactly 11 digits.
 * - Must start with '01'.
 * - Allowed operator prefixes: 013, 014, 015, 016, 017, 018, 019 (01[3-9]).
 * - Must reject 012 and any other invalid prefix (00, 010, 011, 02-09, etc.).
 * - Must contain only ASCII numeric digits (0-9).
 * - Disallows letters, Bangla characters, Bangla numerals, spaces, hyphens, brackets, symbols.
 */

// Centralized allowed operator prefixes
export const VALID_BD_MOBILE_PREFIXES = [
  '013', // Grameenphone
  '014', // Banglalink
  '015', // Teletalk
  '016', // Robi / Airtel
  '017', // Grameenphone
  '018', // Robi
  '019', // Banglalink
] as const;

export type BDMobilePrefix = (typeof VALID_BD_MOBILE_PREFIXES)[number];

// Regex for strictly valid 11-digit BD mobile number: 013XXXXXXXX to 019XXXXXXXX
export const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;

// Regex allowing optional +88 / 88 prefix before 11 digits (for backend/normalizer)
export const BD_PHONE_WITH_CODE_REGEX = /^(?:\+?88)?(01[3-9]\d{8})$/;

export type PhoneValidationErrorType =
  | 'EMPTY'
  | 'INVALID_CHARACTERS'
  | 'BANGLA_DIGITS'
  | 'INVALID_LENGTH'
  | 'INVALID_PREFIX'
  | 'INVALID_OPERATOR';

export interface PhoneValidationResult {
  isValid: boolean;
  error: string | null;
  errorType?: PhoneValidationErrorType | null;
  normalizedPhone: string;
}

export interface ValidationOptions {
  lang?: 'bn' | 'en';
  allowEmpty?: boolean;
}

/**
 * Validates a Bangladesh mobile number according to strict KenaX BD standards.
 *
 * Checks:
 * 1. Empty check
 * 2. Character check (Digits only, no letters, no symbols, no Bangla digits)
 * 3. Exact 11-digit length check
 * 4. Prefix check (Must start with 01)
 * 5. Operator check (Must be 013-019, explicitly rejecting 012, 010, 011, etc.)
 */
export function validateBangladeshMobile(
  input: string | null | undefined,
  options: ValidationOptions = {}
): PhoneValidationResult {
  const { lang = 'bn', allowEmpty = false } = options;
  const isBn = lang === 'bn';

  if (!input || input.trim() === '') {
    if (allowEmpty) {
      return { isValid: true, error: null, normalizedPhone: '' };
    }
    return {
      isValid: false,
      error: isBn ? 'মোবাইল নম্বর আবশ্যক।' : 'Mobile number is required.',
      errorType: 'EMPTY',
      normalizedPhone: '',
    };
  }

  const trimmed = input.trim();

  // Check for Bangla numerals (০-৯)
  if (/[০-৯]/.test(trimmed)) {
    return {
      isValid: false,
      error: isBn
        ? 'মোবাইল নম্বরে শুধুমাত্র সংখ্যা ব্যবহার করুন।'
        : 'Mobile number can contain digits only.',
      errorType: 'BANGLA_DIGITS',
      normalizedPhone: cleanBDPhoneNumber(trimmed),
    };
  }

  // Check for non-digit characters (letters, spaces, symbols, hyphens, brackets, etc.)
  if (/[^0-9]/.test(trimmed)) {
    return {
      isValid: false,
      error: isBn
        ? 'মোবাইল নম্বরে শুধুমাত্র সংখ্যা ব্যবহার করুন।'
        : 'Mobile number can contain digits only.',
      errorType: 'INVALID_CHARACTERS',
      normalizedPhone: cleanBDPhoneNumber(trimmed),
    };
  }

  // Check exact length (Must be 11 digits)
  if (trimmed.length !== 11) {
    return {
      isValid: false,
      error: isBn
        ? 'মোবাইল নম্বর অবশ্যই ১১ সংখ্যার হতে হবে।'
        : 'Mobile number must be exactly 11 digits.',
      errorType: 'INVALID_LENGTH',
      normalizedPhone: trimmed,
    };
  }

  // Check starts with 01
  if (!trimmed.startsWith('01')) {
    return {
      isValid: false,
      error: isBn
        ? 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন।'
        : 'Enter a valid Bangladesh mobile number.',
      errorType: 'INVALID_PREFIX',
      normalizedPhone: trimmed,
    };
  }

  // Check valid operator prefix (013-019, reject 012, 010, 011)
  const prefix3 = trimmed.slice(0, 3);
  if (!VALID_BD_MOBILE_PREFIXES.includes(prefix3 as any)) {
    return {
      isValid: false,
      error: isBn
        ? 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন।'
        : 'Enter a valid Bangladesh mobile number.',
      errorType: 'INVALID_OPERATOR',
      normalizedPhone: trimmed,
    };
  }

  return {
    isValid: true,
    error: null,
    errorType: null,
    normalizedPhone: trimmed,
  };
}

/**
 * Boolean helper for quick check.
 */
export function isValidBDMobileNumber(phone: string | null | undefined): boolean {
  return validateBangladeshMobile(phone).isValid;
}

/**
 * Sanitizes phone input in real-time as the user types or pastes:
 * - Keeps ONLY digits (0-9).
 * - Strips leading +88 or 88 if user pastes a country code.
 * - Restricts maximum length to 11 digits.
 */
export function cleanBDPhoneNumber(input: string | null | undefined): string {
  if (!input) return '';

  let str = String(input).trim();

  // Strip all non-digits
  let digits = str.replace(/\D/g, '');

  // If user pasted with 8801... (13 digits), strip the leading 88
  if (digits.startsWith('8801') && digits.length >= 13) {
    digits = digits.slice(2);
  } else if (digits.startsWith('880') && digits.length >= 12) {
    digits = digits.slice(2);
  }

  // Cap at 11 digits
  return digits.slice(0, 11);
}

/**
 * Normalizes any phone number string into standard 11 digits (01XXXXXXXXX).
 */
export function normalizeBDPhoneNumber(phone: string | null | undefined): string {
  return cleanBDPhoneNumber(phone);
}

/**
 * Validates if two phone numbers match (ignoring spaces, +88, formatting).
 */
export function isSameBDPhone(
  phoneA: string | null | undefined,
  phoneB: string | null | undefined
): boolean {
  const cleanA = normalizeBDPhoneNumber(phoneA);
  const cleanB = normalizeBDPhoneNumber(phoneB);
  if (!cleanA || !cleanB) return false;
  return cleanA === cleanB;
}

/**
 * Returns human-friendly validation error message in English / Bengali context.
 */
export function getBDPhoneValidationError(
  phone: string | null | undefined,
  lang: 'bn' | 'en' = 'en'
): string | null {
  const result = validateBangladeshMobile(phone, { lang });
  return result.error;
}

/**
 * Formats 11-digit phone number for clean readable display (e.g. 01712-345678).
 */
export function formatBDPhoneDisplay(phone: string | null | undefined): string {
  const cleaned = normalizeBDPhoneNumber(phone);
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
  }
  return cleaned;
}

/**
 * Masks phone number for privacy in sensitive Admin views (e.g. 01712****78).
 */
export function maskBDPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  const cleaned = normalizeBDPhoneNumber(phone);
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 5)}****${cleaned.slice(9)}`;
  }
  return phone;
}
