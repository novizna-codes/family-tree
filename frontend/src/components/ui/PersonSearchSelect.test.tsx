import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PersonSearchSelect } from '@/components/ui/PersonSearchSelect';
import type { Person } from '@/types';

const people: Person[] = [
  {
    id: 'p1', family_tree_id: 't1', first_name: 'John', last_name: 'Doe', maiden_name: null, nickname: 'JD',
    gender: 'M', birth_date: '1980-01-01', death_date: null, birth_place: null, death_place: null, is_living: true,
    father_id: null, mother_id: null, photo_path: null, notes: null, created_at: '2026-01-01', updated_at: '2026-01-01',
    full_name: 'John Doe'
  },
  {
    id: 'p2', family_tree_id: 't1', first_name: 'Jane', last_name: 'Doe', maiden_name: null, nickname: null,
    gender: 'F', birth_date: null, death_date: null, birth_place: null, death_place: null, is_living: true,
    father_id: null, mother_id: null, photo_path: null, notes: null, created_at: '2026-01-01', updated_at: '2026-01-01',
    full_name: 'Jane Doe'
  }
];

describe('PersonSearchSelect', () => {
  it('filters and selects a person', async () => {
    const onChange = vi.fn();
    render(<PersonSearchSelect label="Person" value="" onChange={onChange} people={people} />);

    await userEvent.type(screen.getByRole('combobox'), 'jan');
    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Jane Doe'));

    expect(onChange).toHaveBeenCalledWith('p2');
  });

  it('supports clear action', async () => {
    const onChange = vi.fn();
    render(<PersonSearchSelect label="Person" value="p1" onChange={onChange} people={people} />);

    await userEvent.click(screen.getByRole('button', { name: 'Clear selected person' }));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('supports empty option selection', async () => {
    const onChange = vi.fn();
    render(<PersonSearchSelect label="Person" value="p1" onChange={onChange} people={people} />);

    await userEvent.click(screen.getByRole('button', { name: 'Toggle people options' }));
    await userEvent.click(await screen.findByText('None'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('is disabled when requested', () => {
    render(<PersonSearchSelect label="Person" value="" onChange={vi.fn()} people={people} disabled />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});
