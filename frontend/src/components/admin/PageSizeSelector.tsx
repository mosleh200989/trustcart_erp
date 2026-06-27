import React, { useEffect, useMemo, useState } from 'react';

interface PageSizeSelectorProps {
  value: number;
  onChange: (size: number) => void;
  options?: number[];
  label?: string;
  className?: string;
  min?: number;
  max?: number;
}

const DEFAULT_OPTIONS = [30, 50, 100, 200, 500, 1000, 2000];
const CUSTOM_VALUE = '__custom__';

export default function PageSizeSelector({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  label = 'Rows per page',
  className = '',
  min = 1,
  max = 2000,
}: PageSizeSelectorProps) {
  const normalizedOptions = useMemo(
    () => Array.from(new Set(options
      .map((option) => Number(option))
      .filter((option) => Number.isFinite(option) && option >= min && option <= max)))
      .sort((a, b) => a - b),
    [options, min, max],
  );
  const isPresetValue = normalizedOptions.includes(value);
  const [customInput, setCustomInput] = useState(String(value || ''));
  const [customMode, setCustomMode] = useState(false);

  useEffect(() => {
    setCustomInput(String(value || ''));
    if (normalizedOptions.includes(value)) setCustomMode(false);
  }, [value, normalizedOptions]);

  const clampSize = (nextValue: number) => {
    if (!Number.isFinite(nextValue)) return value;
    return Math.min(max, Math.max(min, Math.floor(nextValue)));
  };

  const applyCustomValue = () => {
    const nextSize = clampSize(Number(customInput));
    setCustomInput(String(nextSize));
    setCustomMode(!normalizedOptions.includes(nextSize));
    if (nextSize !== value) onChange(nextSize);
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <label className="text-sm text-gray-600 whitespace-nowrap">{label}:</label>
      <select
        value={!customMode && isPresetValue ? String(value) : CUSTOM_VALUE}
        onChange={(e) => {
          if (e.target.value === CUSTOM_VALUE) {
            setCustomMode(true);
            setCustomInput(String(value || ''));
            return;
          }
          setCustomMode(false);
          onChange(clampSize(Number(e.target.value)));
        }}
        className="border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {normalizedOptions.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
        <option value={CUSTOM_VALUE}>Custom...</option>
      </select>
      {(customMode || !isPresetValue) && (
        <input
          type="number"
          min={min}
          max={max}
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onBlur={applyCustomValue}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              applyCustomValue();
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          className="w-24 border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder={`1-${max}`}
        />
      )}
    </div>
  );
}
