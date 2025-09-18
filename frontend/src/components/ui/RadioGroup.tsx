import React from 'react';
import { cn } from '../../utils/cn';

interface RadioGroupProps {
  label?: string;
  error?: string;
  helper?: string;
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  orientation?: 'horizontal' | 'vertical';
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  label,
  error,
  helper,
  name,
  value,
  onChange,
  options,
  orientation = 'vertical',
}) => {
  return (
    <div className="space-y-1">
      {label && (
        <legend className="block text-sm font-medium text-gray-700">
          {label}
        </legend>
      )}
      <div className={cn(
        'space-y-2',
        orientation === 'horizontal' && 'flex space-x-4 space-y-0'
      )}>
        {options.map((option) => (
          <div key={option.value} className="flex items-center">
            <input
              type="radio"
              id={`${name}-${option.value}`}
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange?.(e.target.value)}
              disabled={option.disabled}
              className={cn(
                'h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300',
                error && 'border-red-300 focus:ring-red-500',
                option.disabled && 'text-gray-400 cursor-not-allowed'
              )}
            />
            <label 
              htmlFor={`${name}-${option.value}`}
              className="ml-2 block text-sm text-gray-700"
            >
              {option.label}
            </label>
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {helper && !error && <p className="text-sm text-gray-500">{helper}</p>}
    </div>
  );
};