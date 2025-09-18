import { familyTreeService } from './familyTreeService';

// Export familyTreeService as treeService for cleaner imports
export const treeService = {
  getTrees: () => familyTreeService.getFamilyTrees(),
  getTree: (id: string) => familyTreeService.getFamilyTree(id),
  createTree: (data: any) => familyTreeService.createFamilyTree(data),
  updateTree: (id: string, data: any) => familyTreeService.updateFamilyTree(id, data),
  deleteTree: (id: string) => familyTreeService.deleteFamilyTree(id),
  
  getPeople: (treeId: string) => familyTreeService.getPeople(treeId),
  getPerson: (treeId: string, personId: string) => familyTreeService.getPerson(treeId, personId),
  createPerson: (treeId: string, data: any) => familyTreeService.createPerson(treeId, data),
  updatePerson: (treeId: string, personId: string, data: any) => familyTreeService.updatePerson(treeId, personId, data),
  deletePerson: (treeId: string, personId: string) => familyTreeService.deletePerson(treeId, personId),
  
  // UNIFIED RELATIONSHIP METHODS
  createRelationship: (treeId: string, personId: string, data: any) => familyTreeService.createRelationship(treeId, personId, data),
  linkExistingRelationship: (treeId: string, personId: string, data: any) => familyTreeService.linkExistingRelationship(treeId, personId, data),
  removeRelationship: (treeId: string, personId: string, relationshipId: string) => familyTreeService.removeRelationship(treeId, personId, relationshipId),
  
  getVisualization: (treeId: string, focusPersonId?: string) => familyTreeService.getTreeVisualization(treeId, focusPersonId),
  exportTree: (treeId: string, format?: string) => familyTreeService.exportTree(treeId, format),
};