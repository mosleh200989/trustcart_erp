import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

type AdminDateInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value?: string | null;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onValueChange?: (value: string) => void;
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(value?: string | null): Date | null {
  if (!value || !ISO_DATE_PATTERN.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDate(date: Date | null): string {
  if (!date || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function emitInputChange(
  onChange: React.ChangeEventHandler<HTMLInputElement> | undefined,
  name: string | undefined,
  value: string,
) {
  if (!onChange) return;
  onChange({
    target: { name, value },
    currentTarget: { name, value },
  } as React.ChangeEvent<HTMLInputElement>);
}

export default function AdminDateInput({
  value,
  onChange,
  onValueChange,
  className,
  name,
  id,
  placeholder = 'dd/mm/yyyy',
  disabled,
  required,
  ...rest
}: AdminDateInputProps) {
  const selected = parseIsoDate(value);

  const handleChange = (date: Date | null) => {
    const nextValue = toIsoDate(date);
    onValueChange?.(nextValue);
    emitInputChange(onChange, name, nextValue);
  };

  return (
    <DatePicker
      id={id}
      name={name}
      selected={selected}
      onChange={handleChange}
      dateFormat="dd/MM/yyyy"
      placeholderText={placeholder}
      disabled={disabled}
      required={required}
      isClearable={!required && !disabled}
      autoComplete="off"
      wrapperClassName="block w-full"
      className={className}
      {...(rest as any)}
    />
  );
}
