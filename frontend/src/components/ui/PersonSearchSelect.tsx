import { Fragment, useMemo, useState } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { cn } from '@/utils/cn';
import type { Person } from '@/types';

interface PersonSearchSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  people: Person[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  helper?: string;
  id?: string;
  filter?: (person: Person) => boolean;
  excludeIds?: string[];
}

function personLabel(person: Person): string {
  const fullName = person.full_name?.trim();
  const fallback = `${person.first_name} ${person.last_name ?? ''}`.trim();
  const year = person.birth_date ? new Date(person.birth_date).getFullYear() : null;
  return `${fullName || fallback}${year ? ` (${year})` : ''}`;
}

export function PersonSearchSelect({
  label,
  value,
  onChange,
  people,
  placeholder = 'Search person...',
  disabled,
  error,
  helper,
  id,
  filter,
  excludeIds = [],
}: PersonSearchSelectProps) {
  const [query, setQuery] = useState('');
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  const selectablePeople = useMemo(() => {
    return people
      .filter((person) => !excludeIds.includes(person.id))
      .filter((person) => (filter ? filter(person) : true));
  }, [excludeIds, filter, people]);

  const selectedPerson = selectablePeople.find((person) => person.id === value) ?? null;

  const filteredPeople = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return selectablePeople;
    }

    return selectablePeople.filter((person) => {
      const fields = [
        person.full_name,
        person.first_name,
        person.last_name,
        person.maiden_name,
        person.nickname,
      ]
        .filter((item): item is string => Boolean(item))
        .map((item) => item.toLowerCase());

      return fields.some((field) => field.includes(normalizedQuery));
    });
  }, [query, selectablePeople]);

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <Combobox
        value={selectedPerson}
        onChange={(person: Person | null) => {
          onChange(person?.id ?? '');
          setQuery('');
        }}
        disabled={disabled}
        nullable
      >
        <div className="relative">
          <div
            className={cn(
              'relative w-full cursor-default overflow-hidden rounded-md border border-gray-300 bg-white text-left shadow-sm focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 sm:text-sm',
              error && 'border-red-300 focus-within:border-red-500 focus-within:ring-red-500',
              disabled && 'bg-gray-50 text-gray-500 cursor-not-allowed'
            )}
          >
            <Combobox.Input
              id={inputId}
              className="w-full border-none py-2 pl-3 pr-20 text-sm leading-5 text-gray-900 focus:ring-0 disabled:bg-gray-50"
              displayValue={(person: Person | null) => (person ? personLabel(person) : '')}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              aria-invalid={!!error}
            />
            <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
              {value && !disabled && (
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="rounded p-1 text-gray-400 hover:text-gray-600"
                  aria-label="Clear selected person"
                >
                  <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
              <Combobox.Button className="p-1 text-gray-400 hover:text-gray-600" aria-label="Toggle people options">
                <ChevronUpDownIcon className="h-5 w-5" aria-hidden="true" />
              </Combobox.Button>
            </div>
          </div>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery('')}
          >
            <Combobox.Options className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
              <Combobox.Option
                value={null}
                className={({ active }) =>
                  cn('relative cursor-default select-none py-2 pl-3 pr-9', active ? 'bg-primary-600 text-white' : 'text-gray-900')
                }
              >
                None
              </Combobox.Option>

              {filteredPeople.length === 0 ? (
                <div className="relative cursor-default select-none py-2 px-3 text-gray-500">No people found.</div>
              ) : (
                filteredPeople.map((person) => (
                  <Combobox.Option
                    key={person.id}
                    value={person}
                    className={({ active }) =>
                      cn('relative cursor-default select-none py-2 pl-3 pr-9', active ? 'bg-primary-600 text-white' : 'text-gray-900')
                    }
                  >
                    {({ selected, active }) => (
                      <>
                        <span className={cn('block truncate', selected ? 'font-medium' : 'font-normal')}>
                          {personLabel(person)}
                        </span>
                        {selected ? (
                          <span
                            className={cn('absolute inset-y-0 right-0 flex items-center pr-3', active ? 'text-white' : 'text-primary-600')}
                          >
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Combobox.Option>
                ))
              )}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {helper && !error && <p className="text-sm text-gray-500">{helper}</p>}
    </div>
  );
}
