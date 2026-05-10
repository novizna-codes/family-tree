import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TreeVisualization } from '@/components/trees/TreeVisualization';
import type { Person } from '@/types';

function buildPerson(overrides: Partial<Person>): Person {
  return {
    id: 'person-1',
    family_tree_id: 'tree-1',
    owner_user_id: 1,
    first_name: 'John',
    last_name: 'Doe',
    maiden_name: null,
    nickname: null,
    gender: 'M',
    birth_date: '1980-01-01',
    death_date: null,
    birth_place: null,
    death_place: null,
    is_living: true,
    father_id: null,
    mother_id: null,
    photo_path: null,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    full_name: 'John Doe',
    ...overrides,
  };
}

describe('TreeVisualization accessibility', () => {
  it('exposes accessible interactive semantics for node and spouse-node', async () => {
    const primaryPerson = buildPerson({
      id: 'person-primary',
      full_name: 'John Doe',
      first_name: 'John',
      last_name: 'Doe',
      birth_date: '1980-01-01',
      gender: 'M',
    });

    const spousePerson = buildPerson({
      id: 'person-spouse',
      full_name: 'Jane Doe',
      first_name: 'Jane',
      last_name: 'Doe',
      birth_date: '1982-01-01',
      gender: 'F',
    });

    render(
      <TreeVisualization
        people={[primaryPerson, spousePerson]}
        relationships={[
          {
            id: 'relationship-1',
            person1_id: primaryPerson.id,
            person2_id: spousePerson.id,
            relationship_type: 'spouse',
          },
        ]}
        showLegend={false}
        showControls={false}
      />
    );

    const primaryNode = await screen.findByRole('button', {
      name: 'Family member: John Doe, born 1980',
    });
    const spouseNode = await screen.findByRole('button', {
      name: 'Family member: Jane Doe, born 1982',
    });

    expect(primaryNode).toHaveAttribute('tabindex', '0');
    expect(spouseNode).toHaveAttribute('tabindex', '0');
  });

  it('triggers person callback on Enter and Space keyboard activation', async () => {
    const onPersonClick = vi.fn();

    const primaryPerson = buildPerson({
      id: 'person-primary',
      full_name: 'John Doe',
      birth_date: '1980-01-01',
    });
    const spousePerson = buildPerson({
      id: 'person-spouse',
      full_name: 'Jane Doe',
      first_name: 'Jane',
      birth_date: '1982-01-01',
      gender: 'F',
    });

    render(
      <TreeVisualization
        people={[primaryPerson, spousePerson]}
        relationships={[
          {
            id: 'relationship-1',
            person1_id: primaryPerson.id,
            person2_id: spousePerson.id,
            relationship_type: 'spouse',
          },
        ]}
        onPersonClick={onPersonClick}
        showLegend={false}
        showControls={false}
      />
    );

    const primaryNode = await screen.findByRole('button', {
      name: 'Family member: John Doe, born 1980',
    });
    const spouseNode = await screen.findByRole('button', {
      name: 'Family member: Jane Doe, born 1982',
    });

    fireEvent.keyDown(primaryNode, { key: 'Enter' });
    fireEvent.keyDown(spouseNode, { key: ' ' });

    expect(onPersonClick).toHaveBeenCalledTimes(2);
    expect(onPersonClick).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: primaryPerson.id })
    );
    expect(onPersonClick).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: spousePerson.id })
    );
  });
});
