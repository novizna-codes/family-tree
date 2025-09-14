import { api } from './api';
import type { FamilyTree, Person } from '@/types';

// Re-export main types for convenience
export type { FamilyTree, Person } from '@/types';

export interface CreateFamilyTreeData {
  name: string;
  description?: string;
}

export interface CreatePersonData {
  first_name: string;
  last_name?: string;
  maiden_name?: string;
  nickname?: string;
  gender?: 'M' | 'F' | 'O';
  birth_date?: string;
  death_date?: string;
  birth_place?: string;
  death_place?: string;
  father_id?: string;
  mother_id?: string;
  notes?: string;
}

export interface AddParentData {
  parent_type: 'father' | 'mother';
  first_name: string;
  last_name?: string;
  gender?: 'M' | 'F' | 'O';
  birth_date?: string;
  death_date?: string;
}

export interface CreateSpouseData {
  first_name: string;
  last_name?: string;
  maiden_name?: string;
  nickname?: string;
  gender?: 'M' | 'F' | 'O';
  birth_date?: string;
  death_date?: string;
  birth_place?: string;
  death_place?: string;
  notes?: string;
  is_deceased?: boolean;
  // Relationship fields
  relationship_type: 'spouse' | 'partner' | 'divorced' | 'separated';
  start_date?: string;
  end_date?: string;
  marriage_place?: string;
  relationship_notes?: string;
}

export interface AddParentData {
  parent_type: 'father' | 'mother';
  first_name: string;
  last_name?: string;
  gender?: 'M' | 'F' | 'O';
  birth_date?: string;
  death_date?: string;
}

export interface CreateSpouseData {
  first_name: string;
  last_name?: string;
  maiden_name?: string;
  nickname?: string;
  gender?: 'M' | 'F' | 'O';
  birth_date?: string;
  death_date?: string;
  birth_place?: string;
  death_place?: string;
  notes?: string;
  is_deceased?: boolean;
  // Relationship fields
  relationship_type: 'spouse' | 'partner' | 'divorced' | 'separated';
  start_date?: string;
  end_date?: string;
  marriage_place?: string;
  relationship_notes?: string;
}

export interface FamilyTreeVisualizationData {
  tree: FamilyTree;
  people: Person[];
  relationships: Relationship[];
  focus_person_id?: string;
}

export interface CreateSpouseData {
  first_name: string;
  last_name?: string;
  maiden_name?: string;
  nickname?: string;
  gender?: 'M' | 'F' | 'O';
  birth_date?: string;
  death_date?: string;
  birth_place?: string;
  death_place?: string;
  notes?: string;
  is_deceased?: boolean;
  // Relationship fields
  relationship_type: 'spouse' | 'partner' | 'divorced' | 'separated';
  start_date?: string;
  end_date?: string;
  marriage_place?: string;
  relationship_notes?: string;
}

export interface LinkSpouseData {
  spouse_id: string;
  relationship_type: 'spouse' | 'partner' | 'divorced' | 'separated';
  start_date?: string;
  end_date?: string;
  marriage_place?: string;
  notes?: string;
}

export interface Relationship {
  id: string;
  person1_id: string;
  person2_id: string;
  relationship_type: 'spouse' | 'partner' | 'divorced' | 'separated';
  start_date?: string;
  end_date?: string;
  marriage_place?: string;
  notes?: string;
  person1?: Person;
  person2?: Person;
}

class FamilyTreeService {
  async getFamilyTrees(): Promise<FamilyTree[]> {
    const response = await api.get<{ data: FamilyTree[] }>('/trees');
    return response.data;
  }

  async getFamilyTree(id: string): Promise<FamilyTree> {
    const response = await api.get<{ data: FamilyTree }>(`/trees/${id}`);
    return response.data;
  }

  async createFamilyTree(data: CreateFamilyTreeData): Promise<FamilyTree> {
    const response = await api.post<{ data: FamilyTree }>('/trees', data);
    return response.data;
  }

  async updateFamilyTree(id: string, data: Partial<CreateFamilyTreeData>): Promise<FamilyTree> {
    const response = await api.put<{ data: FamilyTree }>(`/trees/${id}`, data);
    return response.data;
  }

  async deleteFamilyTree(id: string): Promise<void> {
    await api.delete(`/trees/${id}`);
  }

  async getPeople(treeId: string): Promise<Person[]> {
    const response = await api.get<{ data: Person[] }>(`/trees/${treeId}/people`);
    return response.data;
  }

  async getPerson(treeId: string, personId: string): Promise<Person> {
    const response = await api.get<{ data: Person }>(`/trees/${treeId}/people/${personId}`);
    return response.data;
  }

  async createPerson(treeId: string, data: CreatePersonData): Promise<Person> {
    const response = await api.post<{ data: Person }>(`/trees/${treeId}/people`, data);
    return response.data;
  }

  async updatePerson(treeId: string, personId: string, data: Partial<CreatePersonData>): Promise<Person> {
    const response = await api.put<{ data: Person }>(`/trees/${treeId}/people/${personId}`, data);
    return response.data;
  }

  async deletePerson(treeId: string, personId: string): Promise<void> {
    await api.delete(`/trees/${treeId}/people/${personId}`);
  }

  async addParent(treeId: string, personId: string, data: AddParentData): Promise<Person> {
    const response = await api.post<{ data: Person }>(`/trees/${treeId}/people/${personId}/add-parent`, data);
    return response.data;
  }

  async addChild(treeId: string, personId: string, data: CreatePersonData): Promise<Person> {
    const response = await api.post<{ data: Person }>(`/trees/${treeId}/people/${personId}/add-child`, data);
    return response.data;
  }

  async linkParent(treeId: string, personId: string, data: { parent_id: string; parent_type: 'father' | 'mother' }): Promise<Person> {
    const response = await api.post<{ data: Person }>(`/trees/${treeId}/people/${personId}/link-parent`, data);
    return response.data;
  }

  async linkChild(treeId: string, personId: string, data: { child_id: string }): Promise<Person> {
    const response = await api.post<{ data: Person }>(`/trees/${treeId}/people/${personId}/link-child`, data);
    return response.data;
  }

  async addSpouse(treeId: string, personId: string, data: CreateSpouseData): Promise<Person> {
    const response = await api.post<{ data: Person }>(`/trees/${treeId}/people/${personId}/add-spouse`, data);
    return response.data;
  }

  async linkSpouse(treeId: string, personId: string, data: LinkSpouseData): Promise<Relationship> {
    const response = await api.post<{ data: Relationship }>(`/trees/${treeId}/people/${personId}/link-spouse`, data);
    return response.data;
  }

  async removeSpouse(treeId: string, personId: string, spouseId: string): Promise<void> {
    await api.delete(`/trees/${treeId}/people/${personId}/spouse/${spouseId}`);
  }

  async getTreeVisualization(treeId: string, focusPersonId?: string): Promise<FamilyTreeVisualizationData> {
    const params = focusPersonId ? { focus_person_id: focusPersonId } : {};
    const response = await api.get<{ data: FamilyTreeVisualizationData }>(`/trees/${treeId}/visualization`, { params });
    return response.data;
  }

  async exportTree(treeId: string, format: string = 'json'): Promise<any> {
    const response = await api.get(`/trees/${treeId}/export`, {
      params: { format }
    });
    return response;
  }
}

export const familyTreeService = new FamilyTreeService();