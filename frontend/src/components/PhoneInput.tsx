import React, { useState, useEffect } from 'react';

interface PhoneInputProps {
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
 * Phone input component with fixed +88 prefix (Bangladesh)
 * Validates and enforces exactly 11 digits after the prefix
 */
export default function PhoneInput({
  value,
  onChange,
  name = 'phone',
  required = false,
  className = '',
  placeholder = 'Enter 11 digit number',
  disabled = false,
  showError = true,
}: PhoneInputProps) {
  // Extract digits only from the value (remove +88 prefix if present)
  const getDigitsOnly = (val: string): string => {
    if (!val) return '';
    // Remove +88 or 88 prefix if present, then get remaining digits
    const cleaned = val.replace(/^\+?88/, '').replace(/\D/g, '');
    return cleaned.slice(0, 11); // Max 11 digits
  };

  const [localValue, setLocalValue] = useState(getDigitsOnly(value));
  const [touched, setTouched] = useState(false);

  // Sync with external value changes
  useEffect(() => {
    const digits = getDigitsOnly(value);
    if (digits !== localValue) {
      setLocalValue(digits);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits
    const input = e.target.value.replace(/\D/g, '');
    // Limit to 11 digits
    const limited = input.slice(0, 11);
    setLocalValue(limited);
    
    // Always emit with +88 prefix
    const fullNumber = limited ? `+88${limited}` : '';
    onChange(fullNumber);
  };

  const handleBlur = () => {
    setTouched(true);
  };

  const isValid = localValue.length === 11;
  const hasError = touched && showError && localValue.length > 0 && !isValid;

  return (
    <div className="w-full">
      <div className="flex">
        {/* Fixed +88 prefix */}
        <div className="flex items-center justify-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-600 font-medium select-none">
          +88
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
          maxLength={11}
          pattern="[0-9]{11}"
          inputMode="numeric"
          className={`flex-1 px-4 py-2 border border-gray-300 rounded-r-lg focus:outline-none focus:border-orange-500 ${
            hasError ? 'border-red-500 focus:border-red-500' : ''
          } ${className}`}
          placeholder={placeholder}
        />
      </div>
      {/* Validation message */}
      {hasError && (
        <p className="text-red-500 text-xs mt-1">
          Please enter exactly 11 digits (e.g., 01712345678)
        </p>
      )}
      {touched && localValue.length === 11 && (
        <p className="text-green-600 text-xs mt-1">
          ✓ Valid phone number
        </p>
      )}
    </div>
  );
}

/**
 * Utility function to validate Bangladesh phone numbers
 * @param phone - Phone number to validate (with or without +88 prefix)
 * @returns true if valid, false otherwise
 */
export function validateBDPhone(phone: string): boolean {
  if (!phone) return false;
  // Remove +88 or 88 prefix
  const digits = phone.replace(/^\+?88/, '').replace(/\D/g, '');
  return digits.length === 11;
}

/**
 * Utility function to format phone number with +88 prefix
 * @param phone - Phone number (can be partial or without prefix)
 * @returns Formatted phone number with +88 prefix
 */
export function formatBDPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/^\+?88/, '').replace(/\D/g, '').slice(0, 11);
  return digits ? `+88${digits}` : '';
}
