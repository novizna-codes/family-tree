import { create } from 'zustand';
import { familyTreeService } from '@/services/familyTreeService';
import type { FamilyTree, Person, CreateFamilyTreeData, CreatePersonData } from '@/services/familyTreeService';

interface FamilyTreeState {
  // State
  trees: FamilyTree[];
  currentTree: FamilyTree | null;
  people: Person[];
  currentPerson: Person | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadTrees: () => Promise<void>;
  loadTree: (id: string) => Promise<void>;
  createTree: (data: CreateFamilyTreeData) => Promise<FamilyTree>;
  updateTree: (id: string, data: Partial<CreateFamilyTreeData>) => Promise<void>;
  deleteTree: (id: string) => Promise<void>;
  setCurrentTree: (tree: FamilyTree | null) => void;

  loadPeople: (treeId: string) => Promise<void>;
  loadPerson: (treeId: string, personId: string) => Promise<void>;
  createPerson: (treeId: string, data: CreatePersonData) => Promise<Person>;
  updatePerson: (treeId: string, personId: string, data: Partial<CreatePersonData>) => Promise<void>;
  deletePerson: (treeId: string, personId: string) => Promise<void>;
  setCurrentPerson: (person: Person | null) => void;

  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useFamilyTreeStore = create<FamilyTreeState>((set, get) => ({
  // Initial state
  trees: [],
  currentTree: null,
  people: [],
  currentPerson: null,
  loading: false,
  error: null,

  // Tree actions
  loadTrees: async () => {
    try {
      set({ loading: true, error: null });
      const trees = await familyTreeService.getFamilyTrees();
      set({ trees, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load trees',
        loading: false 
      });
    }
  },

  loadTree: async (id: string) => {
    try {
      set({ loading: true, error: null });
      const tree = await familyTreeService.getFamilyTree(id);
      set({ currentTree: tree, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load tree',
        loading: false 
      });
    }
  },

  createTree: async (data: CreateFamilyTreeData) => {
    try {
      set({ loading: true, error: null });
      const tree = await familyTreeService.createFamilyTree(data);
      const { trees } = get();
      set({ 
        trees: [tree, ...trees],
        currentTree: tree,
        loading: false 
      });
      return tree;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create tree',
        loading: false 
      });
      throw error;
    }
  },

  updateTree: async (id: string, data: Partial<CreateFamilyTreeData>) => {
    try {
      set({ loading: true, error: null });
      const updatedTree = await familyTreeService.updateFamilyTree(id, data);
      const { trees, currentTree } = get();
      
      set({
        trees: trees.map(tree => tree.id === id ? updatedTree : tree),
        currentTree: currentTree?.id === id ? updatedTree : currentTree,
        loading: false
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update tree',
        loading: false 
      });
    }
  },

  deleteTree: async (id: string) => {
    try {
      set({ loading: true, error: null });
      await familyTreeService.deleteFamilyTree(id);
      const { trees, currentTree } = get();
      
      set({
        trees: trees.filter(tree => tree.id !== id),
        currentTree: currentTree?.id === id ? null : currentTree,
        loading: false
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete tree',
        loading: false 
      });
    }
  },

  setCurrentTree: (tree: FamilyTree | null) => {
    set({ currentTree: tree });
  },

  // Person actions
  loadPeople: async (treeId: string) => {
    try {
      set({ loading: true, error: null });
      const people = await familyTreeService.getPeople(treeId);
      set({ people, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load people',
        loading: false 
      });
    }
  },

  loadPerson: async (treeId: string, personId: string) => {
    try {
      set({ loading: true, error: null });
      const person = await familyTreeService.getPerson(treeId, personId);
      set({ currentPerson: person, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load person',
        loading: false 
      });
    }
  },

  createPerson: async (treeId: string, data: CreatePersonData) => {
    try {
      set({ loading: true, error: null });
      const person = await familyTreeService.createPerson(treeId, data);
      const { people } = get();
      set({ 
        people: [...people, person],
        loading: false 
      });
      return person;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create person',
        loading: false 
      });
      throw error;
    }
  },

  updatePerson: async (treeId: string, personId: string, data: Partial<CreatePersonData>) => {
    try {
      set({ loading: true, error: null });
      const updatedPerson = await familyTreeService.updatePerson(treeId, personId, data);
      const { people, currentPerson } = get();
      
      set({
        people: people.map(person => person.id === personId ? updatedPerson : person),
        currentPerson: currentPerson?.id === personId ? updatedPerson : currentPerson,
        loading: false
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update person',
        loading: false 
      });
    }
  },

  deletePerson: async (treeId: string, personId: string) => {
    try {
      set({ loading: true, error: null });
      await familyTreeService.deletePerson(treeId, personId);
      const { people, currentPerson } = get();
      
      set({
        people: people.filter(person => person.id !== personId),
        currentPerson: currentPerson?.id === personId ? null : currentPerson,
        loading: false
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete person',
        loading: false 
      });
    }
  },

  setCurrentPerson: (person: Person | null) => {
    set({ currentPerson: person });
  },

  // Utility actions
  clearError: () => {
    set({ error: null });
  },

  setLoading: (loading: boolean) => {
    set({ loading });
  },
}));