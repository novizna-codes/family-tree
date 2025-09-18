import React from 'react';
import { cn } from '../../utils/cn';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  error,
  helper,
  className,
  id,
  ...props
}) => {
  const checkboxId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1">
      <div className="flex items-center">
        <input
          type="checkbox"
          id={checkboxId}
          className={cn(
            'h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded',
            error && 'border-red-300 focus:ring-red-500',
            props.disabled && 'text-gray-400 cursor-not-allowed',
            className
          )}
          {...props}
        />
        {label && (
          <label htmlFor={checkboxId} className="ml-2 block text-sm text-gray-700">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {helper && !error && <p className="text-sm text-gray-500">{helper}</p>}
    </div>
  );
};