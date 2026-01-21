import React, { useId, useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  inputClassName?: string;
};

export default function PasswordInput({
  inputClassName,
  className,
  disabled,
  id,
  ...props
}: Props) {
  const autoId = useId();
  const inputId = id ?? `password-${autoId}`;
  const [show, setShow] = useState(false);

  return (
    <div className={className}>
      <div className="relative">
        <input
          {...props}
          id={inputId}
          disabled={disabled}
          type={show ? 'text' : 'password'}
          className={`${inputClassName ?? ''} pr-12`}
        />

        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          disabled={disabled}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-r"
        >
          {show ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>
    </div>
  );
}
