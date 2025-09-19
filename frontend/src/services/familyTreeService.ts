import { api } from './api';
import type { FamilyTree, Person, CompleteTreeResponse } from '@/types';

// Re-export main types for convenience
export type { FamilyTree, Person, CompleteTreeResponse } from '@/types';

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
  birth_place?: string;
  death_place?: string;
  notes?: string;
  is_deceased?: boolean;
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

// Unified relationship management interfaces
export interface CreateRelationshipData {
  relationship_type: 'parent' | 'child' | 'spouse';
  relationship_role?: string; // 'father'/'mother' for parent, relationship type for spouse
  // Person data
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
  // Relationship-specific data (for spouse relationships)
  start_date?: string;
  end_date?: string;
  marriage_place?: string;
  relationship_notes?: string;
}

export interface LinkRelationshipData {
  relationship_type: 'parent' | 'child' | 'spouse';
  relationship_role?: string;
  related_person_id: string;
  // Relationship-specific data (for spouse relationships)
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

  // NEW UNIFIED RELATIONSHIP MANAGEMENT METHODS
  
  /**
   * Create a new person and establish a relationship (replaces addParent, addChild, addSpouse)
   */
  async createRelationship(treeId: string, personId: string, data: CreateRelationshipData): Promise<Person> {
    const response = await api.post<{ data: Person }>(`/trees/${treeId}/people/${personId}/relationships`, data);
    return response.data;
  }

  /**
   * Link existing people in a relationship (replaces linkParent, linkChild, linkSpouse)
   */
  async linkExistingRelationship(treeId: string, personId: string, data: LinkRelationshipData): Promise<Person | Relationship> {
    const response = await api.post<{ data: Person | Relationship }>(`/trees/${treeId}/people/${personId}/relationships/link`, data);
    return response.data;
  }

  /**
   * Remove any type of relationship (replaces removeSpouse and future relationship removals)
   */
  async removeRelationship(treeId: string, personId: string, relationshipId: string): Promise<void> {
    await api.delete(`/trees/${treeId}/people/${personId}/relationships/${relationshipId}`);
  }

  async getTreeVisualization(treeId: string, focusPersonId?: string): Promise<FamilyTreeVisualizationData> {
    const params = focusPersonId ? { focus_person_id: focusPersonId } : {};
    const response = await api.get<{ data: FamilyTreeVisualizationData }>(`/trees/${treeId}/visualization`, { params });
    return response.data;
  }

  async getCompleteTree(treeId: string, focusPersonId?: string, maxGenerations?: number): Promise<CompleteTreeResponse> {
    const params: Record<string, any> = {};
    if (focusPersonId) params.focus_person_id = focusPersonId;
    if (maxGenerations) params.max_generations = maxGenerations;
    
    const response = await api.get<{ data: CompleteTreeResponse }>(`/trees/${treeId}/complete-tree`, { params });
    return response.data.data; // Extract from nested data structure
  }

  async exportTree(treeId: string, format: string = 'json'): Promise<any> {
    const response = await api.get(`/trees/${treeId}/export`, {
      params: { format }
    });
    return response;
  }
}

export const familyTreeService = new FamilyTreeService();