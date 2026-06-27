import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaCheckCircle, FaChevronDown, FaPhoneAlt, FaWhatsapp } from 'react-icons/fa';
import { CALL_OUTCOME_OPTIONS, CALL_OUTCOME_TONES, type CallOutcomeValue } from '@/constants/adminOptions';

type Props = {
  value: CallOutcomeValue | '';
  onChange: (value: CallOutcomeValue | '') => void;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  excludeValues?: string[];
};

const toneClasses: Record<string, { dot: string }> = {
  success: { dot: 'bg-green-500' },
  warning: { dot: 'bg-orange-500' },
  danger: { dot: 'bg-red-500' },
  whatsapp: { dot: 'bg-[#25D366]' },
  default: { dot: 'bg-gray-300' },
};

const getTone = (value?: string) => {
  return CALL_OUTCOME_TONES[value || ''] || 'default';
};

export default function CallOutcomeSelect({
  value,
  onChange,
  id,
  disabled = false,
  placeholder = 'Select outcome...',
  excludeValues = [],
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const options = useMemo(
    () => CALL_OUTCOME_OPTIONS.filter((option) => !excludeValues.includes(option.value)),
    [excludeValues],
  );
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" id={id} value={value} />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((next) => !next)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm shadow-sm transition hover:border-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-gray-100"
      >
        <span className={`inline-flex items-center gap-2 ${selected ? 'text-gray-900' : 'text-gray-500'}`}>
          {selected ? (
            selected.value === 'whatsapp_message_sent' ? (
              <FaWhatsapp className="text-[#25D366]" />
            ) : selected.value === 'order_confirmed' ? (
              <FaCheckCircle className="text-green-500" />
            ) : (
              <span className={`h-2.5 w-2.5 rounded-full ${toneClasses[getTone(selected.value)].dot}`} />
            )
          ) : (
            <FaPhoneAlt className="text-gray-400" />
          )}
          {selected?.label || placeholder}
        </span>
        <FaChevronDown className={`text-xs text-gray-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
          <button
            type="button"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
          >
            <FaPhoneAlt className="text-gray-300" />
            {placeholder}
          </button>
          {options.map((option) => {
            const tone = getTone(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 ${value === option.value ? 'bg-green-50' : ''}`}
              >
                <span className="flex items-center gap-2">
                  {option.value === 'whatsapp_message_sent' ? (
                    <FaWhatsapp className="text-[#25D366]" />
                  ) : option.value === 'order_confirmed' ? (
                    <FaCheckCircle className="text-green-500" />
                  ) : (
                    <span className={`h-2.5 w-2.5 rounded-full ${toneClasses[tone].dot}`} />
                  )}
                  <span>{option.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
