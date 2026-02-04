import React from 'react';

interface PageSizeSelectorProps {
  value: number;
  onChange: (size: number) => void;
  options?: number[];
  label?: string;
  className?: string;
}

// Default page size options with max of 300
const DEFAULT_OPTIONS = [10, 25, 50, 100, 150, 200, 300];

export default function PageSizeSelector({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  label = 'Rows per page',
  className = '',
}: PageSizeSelectorProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="text-sm text-gray-600 whitespace-nowrap">{label}:</label>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {options.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </div>
  );
}
