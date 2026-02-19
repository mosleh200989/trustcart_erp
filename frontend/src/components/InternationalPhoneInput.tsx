import React, { useState, useEffect } from 'react';

interface InternationalPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  required?: boolean;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  showError?: boolean;
}

/**
 * International phone input component (no fixed country prefix).
 * Accepts phone numbers from any country.
 * The user types the full number including country code (e.g. +1, +44, +971).
 */
export default function InternationalPhoneInput({
  value,
  onChange,
  name = 'phone',
  required = false,
  className = '',
  placeholder = '+XXX XXXXXXXXX',
  disabled = false,
  showError = true,
}: InternationalPhoneInputProps) {
  const [localValue, setLocalValue] = useState(value || '');
  const [touched, setTouched] = useState(false);

  // Sync with external value changes
  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value || '');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;
    // Allow digits, +, spaces, and hyphens for international formatting
    input = input.replace(/[^0-9+\-\s()]/g, '');
    setLocalValue(input);
    onChange(input);
  };

  const handleBlur = () => {
    setTouched(true);
  };

  // A basic sanity check: number should have at least 7 digits (excluding formatting chars)
  const digitsOnly = localValue.replace(/\D/g, '');
  const isValid = digitsOnly.length >= 7 && digitsOnly.length <= 15;
  const hasError = touched && showError && localValue.length > 0 && !isValid;

  return (
    <div className="w-full">
      <div className="flex">
        {/* Globe icon prefix */}
        <div className="flex items-center justify-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-600 font-medium select-none">
          🌐
        </div>
        {/* Input field */}
        <input
          type="tel"
          name={name}
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          required={required}
          disabled={disabled}
          inputMode="tel"
          className={`flex-1 px-4 py-2 border border-gray-300 rounded-r-lg focus:outline-none focus:border-orange-500 ${
            hasError ? 'border-red-500 focus:border-red-500' : ''
          } ${className}`}
          placeholder={placeholder}
        />
      </div>
      {/* Validation message */}
      {hasError && (
        <p className="text-red-500 text-xs mt-1">
          Please enter a valid international phone number (7-15 digits)
        </p>
      )}
      {touched && isValid && localValue.length > 0 && (
        <p className="text-green-600 text-xs mt-1">
          ✓ Valid phone number
        </p>
      )}
    </div>
  );
}

/**
 * Validate an international phone number (basic check: 7-15 digits)
 */
export function validateInternationalPhone(phone: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}
