import React, { useState, useEffect } from 'react';
import { Phone, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  validateBangladeshMobile,
  cleanBDPhoneNumber,
  PhoneValidationResult,
  BD_PHONE_REGEX,
} from '../../utils/phoneUtils';

export interface PhoneInputProps {
  value: string;
  onChange: (value: string, result: PhoneValidationResult) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  label?: string;
  subLabel?: string;
  error?: string | null;
  showError?: boolean;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  inputClassName?: string;
  lang?: 'bn' | 'en';
  allowEmpty?: boolean;
  id?: string;
  name?: string;
  autoFocus?: boolean;
  leftIcon?: React.ReactNode;
  showSuccessBadge?: boolean;
  darkTheme?: boolean;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  onBlur,
  onFocus,
  placeholder,
  label,
  subLabel,
  error: externalError,
  showError = true,
  required = true,
  disabled = false,
  readOnly = false,
  className = '',
  inputClassName = '',
  lang = 'bn',
  allowEmpty = false,
  id,
  name,
  autoFocus = false,
  leftIcon,
  showSuccessBadge = true,
  darkTheme = false,
}) => {
  const isBn = lang === 'bn';
  const [touched, setTouched] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Validate current value
  const validation = validateBangladeshMobile(value, {
    lang,
    allowEmpty: allowEmpty || (!required && !value),
  });

  const isCompleteAndValid = validation.isValid && value.length === 11;

  // Handle direct text changes & paste
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cleaned = cleanBDPhoneNumber(rawVal);

    const valResult = validateBangladeshMobile(cleaned, {
      lang,
      allowEmpty: allowEmpty || (!required && !cleaned),
    });

    // Real-time error handling: only show error if length >= 11 or touched and invalid
    if (cleaned.length === 11 && !valResult.isValid) {
      setLocalError(valResult.error);
    } else if (touched && cleaned.length < 11 && cleaned.length > 0) {
      setLocalError(isBn ? 'মোবাইল নম্বর অবশ্যই ১১ সংখ্যার হতে হবে।' : 'Mobile number must be exactly 11 digits.');
    } else if (!touched || valResult.isValid || cleaned.length === 0) {
      setLocalError(null);
    }

    onChange(cleaned, valResult);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setTouched(true);
    const cleaned = cleanBDPhoneNumber(value);
    const valResult = validateBangladeshMobile(cleaned, {
      lang,
      allowEmpty: allowEmpty || (!required && !cleaned),
    });

    if (!valResult.isValid) {
      setLocalError(valResult.error);
    } else {
      setLocalError(null);
    }

    if (onBlur) {
      onBlur(e);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (onFocus) {
      onFocus(e);
    }
  };

  const activeError = externalError !== undefined ? externalError : (touched ? localError : null);

  const defaultPlaceholder = isBn ? '০১XXXXXXXXX (১১ সংখ্যার মোবাইল নম্বর)' : '01XXXXXXXXX (11-digit mobile)';

  return (
    <div className={`space-y-1.5 ${className}`}>
      {(label || subLabel) && (
        <div className="flex items-center justify-between">
          {label && (
            <label htmlFor={id} className={`block text-xs font-bold ${darkTheme ? 'text-slate-300' : 'text-slate-700 dark:text-slate-300'}`}>
              {label} {required && <span className="text-rose-500">*</span>}
            </label>
          )}
          {subLabel && (
            <span className="text-[10px] text-slate-400 font-medium">
              {subLabel}
            </span>
          )}
        </div>
      )}

      <div className="relative flex items-center">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 flex items-center gap-1">
          {leftIcon || <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
        </div>

        <input
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={11}
          id={id}
          name={name}
          value={value}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder || defaultPlaceholder}
          disabled={disabled}
          readOnly={readOnly}
          autoFocus={autoFocus}
          className={`w-full pl-10 pr-10 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-mono transition-all outline-none ${
            activeError
              ? 'border-2 border-rose-500 bg-rose-50/20 text-rose-900 dark:text-rose-200 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-500/20'
              : isCompleteAndValid
              ? 'border-2 border-emerald-500 bg-emerald-50/10 text-slate-900 dark:text-white dark:bg-emerald-950/10 focus:ring-2 focus:ring-emerald-500/20'
              : darkTheme
              ? 'bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
              : 'bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${inputClassName}`}
        />

        {/* Right validation state icon */}
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
          {activeError ? (
            <AlertCircle className="w-4 h-4 text-rose-500 animate-pulse" />
          ) : isCompleteAndValid && showSuccessBadge ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : value.length > 0 ? (
            <span className="text-[10px] font-mono font-bold text-slate-400">
              {value.length}/11
            </span>
          ) : null}
        </div>
      </div>

      {showError && activeError && (
        <p className="text-[11px] font-medium text-rose-500 dark:text-rose-400 flex items-center gap-1 mt-1 animate-fadeIn">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{activeError}</span>
        </p>
      )}
    </div>
  );
};

export default PhoneInput;
