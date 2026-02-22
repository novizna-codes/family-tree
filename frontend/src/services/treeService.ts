import { familyTreeService, type CreateFamilyTreeData, type CreatePersonData, type CreateRelationshipData, type UpdateRelationshipData, type LinkRelationshipData } from './familyTreeService';

// Export familyTreeService as treeService for cleaner imports
export const treeService = {
  getTrees: () => familyTreeService.getFamilyTrees(),
  getTree: (id: string) => familyTreeService.getFamilyTree(id),
  createTree: (data: CreateFamilyTreeData) => familyTreeService.createFamilyTree(data),
  updateTree: (id: string, data: Partial<CreateFamilyTreeData>) => familyTreeService.updateFamilyTree(id, data),
  deleteTree: (id: string) => familyTreeService.deleteFamilyTree(id),

  getPeople: (treeId: string) => familyTreeService.getPeople(treeId),
  getPerson: (treeId: string, personId: string) => familyTreeService.getPerson(treeId, personId),
  createPerson: (treeId: string, data: CreatePersonData) => familyTreeService.createPerson(treeId, data),
  updatePerson: (treeId: string, personId: string, data: Partial<CreatePersonData>) => familyTreeService.updatePerson(treeId, personId, data),
  deletePerson: (treeId: string, personId: string) => familyTreeService.deletePerson(treeId, personId),

  // UNIFIED RELATIONSHIP METHODS
  createRelationship: (treeId: string, personId: string, data: CreateRelationshipData) => familyTreeService.createRelationship(treeId, personId, data),
  updateRelationship: (treeId: string, personId: string, relationshipId: string, data: UpdateRelationshipData) => familyTreeService.updateRelationship(treeId, personId, relationshipId, data),
  removeRelationship: (treeId: string, personId: string, relationshipId: string) => familyTreeService.removeRelationship(treeId, personId, relationshipId),
  copyPerson: (treeId: string, personId: string, targetTreeId: string) => familyTreeService.copyPerson(treeId, personId, targetTreeId),

  getVisualization: (treeId: string, focusPersonId?: string) => familyTreeService.getTreeVisualization(treeId, focusPersonId),
  exportTree: (treeId: string, format?: string) => familyTreeService.exportTree(treeId, format),
  linkExistingRelationship: (treeId: string, personId: string, data: LinkRelationshipData) => familyTreeService.linkExistingRelationship(treeId, personId, data),
};
