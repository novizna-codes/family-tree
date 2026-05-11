import { familyTreeService, type CreateFamilyTreeData, type CreatePersonData, type CreateRelationshipData, type UpdateRelationshipData, type LinkRelationshipData, type GetPeopleParams } from './familyTreeService';
import type {
  CopyPersonRequest,
  MergePeoplePayload,
  MergePeoplePreviewPayload,
  PaginatedApiResponse,
  Person,
  SearchPeopleOptions,
  TreeExportArtifactMetadata,
} from '@/types';

// Export familyTreeService as treeService for cleaner imports
export const treeService = {
  getTrees: () => familyTreeService.getFamilyTrees(),
  getTree: (id: string) => familyTreeService.getFamilyTree(id),
  createTree: (data: CreateFamilyTreeData) => familyTreeService.createFamilyTree(data),
  updateTree: (id: string, data: Partial<CreateFamilyTreeData>) => familyTreeService.updateFamilyTree(id, data),
  deleteTree: (id: string) => familyTreeService.deleteFamilyTree(id),

  getPeople: <TPaginated extends boolean = false>(
    treeId: string,
    params?: GetPeopleParams & { paginate?: TPaginated }
  ) => familyTreeService.getPeople<TPaginated>(treeId, params) as Promise<TPaginated extends true ? PaginatedApiResponse<Person> : Person[]>,
  getGlobalPeople: <TPaginated extends boolean = false>(
    params?: GetPeopleParams & { paginate?: TPaginated }
  ) => familyTreeService.getGlobalPeople<TPaginated>(params) as Promise<TPaginated extends true ? PaginatedApiResponse<Person> : Person[]>,
  getPerson: (treeId: string, personId: string) => familyTreeService.getPerson(treeId, personId),
  createPerson: (treeId: string, data: CreatePersonData) => familyTreeService.createPerson(treeId, data),
  updatePerson: (treeId: string, personId: string, data: Partial<CreatePersonData>) => familyTreeService.updatePerson(treeId, personId, data),
  deletePerson: (treeId: string, personId: string) => familyTreeService.deletePerson(treeId, personId),

  // UNIFIED RELATIONSHIP METHODS
  createRelationship: (treeId: string, personId: string, data: CreateRelationshipData) => familyTreeService.createRelationship(treeId, personId, data),
  updateRelationship: (treeId: string, personId: string, relationshipId: string, data: UpdateRelationshipData) => familyTreeService.updateRelationship(treeId, personId, relationshipId, data),
  removeRelationship: (treeId: string, personId: string, relationshipId: string) => familyTreeService.removeRelationship(treeId, personId, relationshipId),
  copyPerson: (
    treeId: string,
    personId: string,
    targetTreeId: string | undefined,
    options?: CopyPersonRequest
  ) => familyTreeService.copyPerson(treeId, personId, targetTreeId, options),

  getVisualization: (treeId: string, focusPersonId?: string) => familyTreeService.getTreeVisualization(treeId, focusPersonId),
  exportTree: (treeId: string, format?: string) => familyTreeService.exportTree(treeId, format),
  linkExistingRelationship: (treeId: string, personId: string, data: LinkRelationshipData) => familyTreeService.linkExistingRelationship(treeId, personId, data),
  searchPeople: (query: string, options?: SearchPeopleOptions) => familyTreeService.searchPeople(query, options),
  mergePeople: (payload: MergePeoplePayload) => familyTreeService.mergePeople(payload),
  previewMergePeople: (payload: MergePeoplePreviewPayload) => familyTreeService.previewMergePeople(payload),
  listExportArtifacts: (treeId: string) => familyTreeService.listExportArtifacts(treeId),
  uploadExportArtifact: (treeId: string, file: Blob, fileName: string, metadata?: TreeExportArtifactMetadata) =>
    familyTreeService.uploadExportArtifact(treeId, file, fileName, metadata),
  deleteExportArtifact: (treeId: string, artifactId: string) => familyTreeService.deleteExportArtifact(treeId, artifactId),
  getExportArtifactDownloadUrl: (treeId: string, artifactId: string) =>
    familyTreeService.getExportArtifactDownloadUrl(treeId, artifactId),
};
