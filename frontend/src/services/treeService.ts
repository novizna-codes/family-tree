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
  
  addParent: (treeId: string, personId: string, data: any) => familyTreeService.addParent(treeId, personId, data),
  addChild: (treeId: string, personId: string, data: any) => familyTreeService.addChild(treeId, personId, data),
  linkParent: (treeId: string, personId: string, data: any) => familyTreeService.linkParent(treeId, personId, data),
  linkChild: (treeId: string, personId: string, data: any) => familyTreeService.linkChild(treeId, personId, data),
  
  addSpouse: (treeId: string, personId: string, data: any) => familyTreeService.addSpouse(treeId, personId, data),
  linkSpouse: (treeId: string, personId: string, data: any) => familyTreeService.linkSpouse(treeId, personId, data),
  removeSpouse: (treeId: string, personId: string, spouseId: string) => familyTreeService.removeSpouse(treeId, personId, spouseId),
  
  getVisualization: (treeId: string, focusPersonId?: string) => familyTreeService.getTreeVisualization(treeId, focusPersonId),
  exportTree: (treeId: string, format?: string) => familyTreeService.exportTree(treeId, format),
};