import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { Person, VisualizationPerson } from '@/types';

interface TreeNode extends d3.HierarchyPointNode<VisualizationPerson> {
  x: number;
  y: number;
}

interface LocalRelationship {
  id: string;
  person1_id: string;
  person2_id: string;
  relationship_type: string;
  relationship_role?: string;
}

interface TreeVisualizationProps {
  people: Person[];
  relationships?: LocalRelationship[];
  onPersonClick?: (person: VisualizationPerson | Person, event?: MouseEvent) => void;
  onFamilySwitch?: (personId: string) => void;
  className?: string;
}

interface FamilyContext {
  currentPerson: VisualizationPerson | null;
  availableFamilies: Array<{
    person: VisualizationPerson;
    relation: 'spouse' | 'self';
    familySize: number;
  }>;
}

export function TreeVisualization({ people, relationships = [], onPersonClick, onFamilySwitch, className = '' }: TreeVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [rootTreesCount, setRootTreesCount] = useState(1);
  const [familyContext, setFamilyContext] = useState<FamilyContext>({
    currentPerson: null,
    availableFamilies: []
  });
  const [showFamilySelector, setShowFamilySelector] = useState(false);

  useEffect(() => {
    if (!svgRef.current || people.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    // Create hierarchy data structure - get all root trees
    const rootTrees = createMultipleHierarchies(people, relationships);
    setRootTreesCount(rootTrees.length);

    // Calculate family context for navigation
    const context = calculateFamilyContext(people, relationships, rootTrees);
    setFamilyContext(context);

    // If single tree, use existing logic
    if (rootTrees.length === 1) {
      renderSingleTree(svg, rootTrees[0], dimensions, onPersonClick);
    } else {
      // Render multiple trees side by side (forest layout)
      renderForestLayout(svg, rootTrees, dimensions, onPersonClick);
    }

  }, [people, relationships, dimensions, onPersonClick]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const container = svgRef.current.parentElement;
        if (container) {
          setDimensions({
            width: container.clientWidth,
            height: Math.max(600, container.clientHeight)
          });
        }
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`w-full h-full overflow-hidden ${className}`}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="border border-gray-200 rounded-lg bg-white"
      >
      </svg>

      {/* Controls */}
      <div className="absolute top-4 right-4 flex gap-2">
        {familyContext.availableFamilies.length > 1 && (
          <button
            onClick={() => setShowFamilySelector(!showFamilySelector)}
            className="px-3 py-2 bg-blue-600 text-white border border-blue-700 rounded-md text-sm font-medium hover:bg-blue-700 shadow-sm"
          >
            Switch Family ({familyContext.availableFamilies.length})
          </button>
        )}
        <button
          onClick={() => {
            const svg = d3.select(svgRef.current);
            svg.transition().duration(300).call(
              // Use a wrapper to handle the transition type compatibility
              (transition: any) => d3.zoom<SVGSVGElement, unknown>().transform(transition, d3.zoomIdentity.scale(1))
            );
          }}
          className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
        >
          Reset View
        </button>
      </div>

      {/* Family Selector Modal */}
      {showFamilySelector && (
        <div className="absolute top-16 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-10 min-w-64">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-gray-900">Available Families</h3>
            <button
              onClick={() => setShowFamilySelector(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2">
            {familyContext.availableFamilies.map((family, index) => (
              <button
                key={`${family.person.id}-${index}`}
                onClick={() => {
                  if (onFamilySwitch) {
                    onFamilySwitch(family.person.id);
                  }
                  setShowFamilySelector(false);
                }}
                className="w-full text-left p-2 rounded-md hover:bg-gray-50 border border-gray-200"
              >
                <div className="font-medium text-sm">
                  {family.person.first_name} {family.person.last_name}'s Family
                </div>
                <div className="text-xs text-gray-500">
                  {family.relation === 'spouse' ? 'Spouse\'s Family' : 'Current Family'} • {family.familySize} members
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
        <div className="text-sm font-medium text-gray-900 mb-2">Legend</div>
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
            <span>Male</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-pink-500"></div>
            <span>Female</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-500"></div>
            <span>Other</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-4 h-1 bg-pink-600" style={{ borderTop: '2px dashed #e11d48' }}></div>
            <span>Spouse</span>
          </div>
          {rootTreesCount > 1 && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="text-xs text-gray-600">
                {rootTreesCount} independent families
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to calculate family context for navigation
function calculateFamilyContext(_people: Person[], _relationships: LocalRelationship[], rootTrees: VisualizationPerson[]): FamilyContext {
  const availableFamilies: FamilyContext['availableFamilies'] = [];

  // For each root tree, find the main person and their spouses
  rootTrees.forEach(tree => {
    const familySize = countFamilyMembers(tree);
    availableFamilies.push({
      person: tree,
      relation: 'self',
      familySize
    });

    // Add spouse families if they exist in other trees
    if (tree.spouses && tree.spouses.length > 0) {
      tree.spouses.forEach((spouse: VisualizationPerson) => {
        // Check if spouse has their own family tree
        const spouseFamilyTree = rootTrees.find(otherTree =>
          otherTree.id !== tree.id && hasPersonInTree(otherTree, spouse.id)
        );

        if (spouseFamilyTree) {
          const spouseFamilySize = countFamilyMembers(spouseFamilyTree);
          availableFamilies.push({
            person: spouse,
            relation: 'spouse',
            familySize: spouseFamilySize
          });
        }
      });
    }
  });

  function countFamilyMembers(tree: VisualizationPerson): number {
    let count = 1; // Count the root
    count += tree.spouses ? tree.spouses.length : 0; // Count spouses

    // Recursively count children
    function countChildren(person: VisualizationPerson): number {
      if (!person.children || person.children.length === 0) return 0;
      let childCount = person.children.length;
      person.children.forEach((child: VisualizationPerson) => {
        childCount += countChildren(child);
        childCount += child.spouses ? child.spouses.length : 0;
      });
      return childCount;
    }

    count += countChildren(tree);
    return count;
  }

  function hasPersonInTree(tree: VisualizationPerson, personId: string): boolean {
    if (tree.id === personId) return true;
    if (tree.spouses && tree.spouses.some((spouse: VisualizationPerson) => spouse.id === personId)) return true;
    if (tree.children) {
      return tree.children.some((child: VisualizationPerson) => hasPersonInTree(child, personId));
    }
    return false;
  }

  // Remove duplicates based on person ID
  const uniqueFamilies = availableFamilies.filter((family, index, arr) =>
    arr.findIndex(f => f.person.id === family.person.id) === index
  );

  return {
    currentPerson: rootTrees.length > 0 ? rootTrees[0] : null,
    availableFamilies: uniqueFamilies
  };
}


// Helper function to create multiple hierarchies for forest layout
function createMultipleHierarchies(people: Person[], relationships: LocalRelationship[] = []): VisualizationPerson[] {
  if (people.length === 0) return [];

  // Create a map for quick lookup
  const personMap = new Map<string, VisualizationPerson>();

  // Initialize all people in the map with children and spouses arrays
  people.forEach(person => {
    personMap.set(person.id, { ...person, children: [], spouses: [] });
  });

  // Build spouse relationships
  relationships.forEach(relationship => {
    if (relationship.relationship_type === 'spouse') {
      const person1 = personMap.get(relationship.person1_id);
      const person2 = personMap.get(relationship.person2_id);

      if (person1 && person2) {
        // Add each as spouse of the other
        person1.spouses.push(person2);
        person2.spouses.push(person1);
      }
    }
  });

  // Build parent-child relationships first
  people.forEach(person => {
    // Find children for this person
    const children = people.filter(p =>
      p.father_id === person.id || p.mother_id === person.id
    );

    const personWithChildren = personMap.get(person.id)!;
    personWithChildren.children = children.map(child => personMap.get(child.id)!);
  });

  // Find connected components (groups of people connected by any relationships)
  const connectedComponents = findConnectedComponents(people, relationships);

  // For each connected component, find a set of roots that cover everyone
  const allRoots: VisualizationPerson[] = [];
  const coveredInHierarchy = new Set<string>();

  connectedComponents.forEach(component => {
    const componentIds = new Set(component.map(p => p.id));

    // Sort component people to have a stable starting point 
    // Heuristics: 
    // 1. People with children first (ancestors)
    // 2. Males first (traditional structure preference)
    // 3. Alphabetical / ID (stability)
    const sortedComponent = [...component].sort((a, b) => {
      const aHasChildren = people.some(p => p.father_id === a.id || p.mother_id === a.id);
      const bHasChildren = people.some(p => p.father_id === b.id || p.mother_id === b.id);

      if (aHasChildren && !bHasChildren) return -1;
      if (!aHasChildren && bHasChildren) return 1;

      if (a.gender === 'M' && b.gender !== 'M') return -1;
      if (a.gender !== 'M' && b.gender === 'M') return 1;

      return a.id.localeCompare(b.id);
    });

    // Find all people with no parents in this component
    const potentialRoots = sortedComponent.filter(person => {
      const hasParentsInComponent = (person.father_id && componentIds.has(person.father_id)) ||
        (person.mother_id && componentIds.has(person.mother_id));
      return !hasParentsInComponent;
    });

    // If no roots (cycle), use the first person in the sorted component
    const rootsToProcess = potentialRoots.length > 0 ? potentialRoots : [sortedComponent[0]];

    rootsToProcess.forEach(root => {
      if (coveredInHierarchy.has(root.id)) return;

      // This is a new independent lineage root
      const rootNode = personMap.get(root.id)!;
      allRoots.push(rootNode);

      // Mark everyone reachable from this root as covered
      markReachableAsCovered(rootNode, coveredInHierarchy);
    });
  });

  return allRoots.length > 0 ? allRoots : [personMap.get(people[0].id) || { ...people[0], children: [], spouses: [] }];
}

/**
 * Recursively marks a person, their spouses, and all their descendants as covered.
 * This ensures we don't pick a spouse or a child as a redundant root.
 */
function markReachableAsCovered(person: VisualizationPerson, covered: Set<string>) {
  if (!person || covered.has(person.id)) return;
  covered.add(person.id);

  // Mark spouses (they are rendered next to this person)
  if (person.spouses) {
    person.spouses.forEach((spouse: VisualizationPerson) => {
      if (!covered.has(spouse.id)) {
        covered.add(spouse.id);
        // Spouses' descendants are usually the same, but let's be thorough
        if (spouse.children) {
          spouse.children.forEach((child: VisualizationPerson) => markReachableAsCovered(child, covered));
        }
      }
    });
  }

  // Mark children
  if (person.children) {
    person.children.forEach((child: VisualizationPerson) => markReachableAsCovered(child, covered));
  }
}

// Helper function to find connected components in the family graph
function findConnectedComponents(people: Person[], relationships: LocalRelationship[]): Person[][] {
  const visited = new Set<string>();
  const components: Person[][] = [];

  people.forEach(person => {
    if (!visited.has(person.id)) {
      const component: Person[] = [];
      const queue = [person.id];

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        if (visited.has(currentId)) continue;

        visited.add(currentId);
        const currentPerson = people.find(p => p.id === currentId);
        if (currentPerson) {
          component.push(currentPerson);

          // Add connected people to queue
          // 1. Parents (traverse upward)
          if (currentPerson.father_id) {
            const father = people.find(p => p.id === currentPerson.father_id);
            if (father && !visited.has(father.id)) {
              queue.push(father.id);
            }
          }
          if (currentPerson.mother_id) {
            const mother = people.find(p => p.id === currentPerson.mother_id);
            if (mother && !visited.has(mother.id)) {
              queue.push(mother.id);
            }
          }

          // 2. Children (traverse downward)
          people.forEach(p => {
            if ((p.father_id === currentId || p.mother_id === currentId) && !visited.has(p.id)) {
              queue.push(p.id);
            }
          });

          // 3. Spouses
          relationships.forEach(rel => {
            if (rel.relationship_type === 'spouse') {
              if (rel.person1_id === currentId && !visited.has(rel.person2_id)) {
                queue.push(rel.person2_id);
              }
              if (rel.person2_id === currentId && !visited.has(rel.person1_id)) {
                queue.push(rel.person1_id);
              }
            }
          });
        }
      }

      if (component.length > 0) {
        components.push(component);
      }
    }
  });

  return components;
}

// Render a single tree (existing logic)
function renderSingleTree(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  hierarchyData: VisualizationPerson,
  dimensions: { width: number; height: number },
  onPersonClick?: (person: VisualizationPerson | Person, event?: MouseEvent) => void
) {
  // Create tree layout with more horizontal space for spouses
  const treeLayout = d3.tree<VisualizationPerson>()
    .size([dimensions.width - 100, dimensions.height - 100])
    .separation((a, b) => {
      // Add extra space if either node has spouses
      const aHasSpouses = a.data.spouses && a.data.spouses.length > 0;
      const bHasSpouses = b.data.spouses && b.data.spouses.length > 0;
      return (aHasSpouses || bHasSpouses) ? 2 : 1;
    });

  const root = d3.hierarchy(hierarchyData);
  const treeData = treeLayout(root) as TreeNode;

  // Create group for the tree
  const g = svg
    .append('g')
    .attr('transform', 'translate(50, 50)');

  // Add zoom and pan functionality
  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.5, 2])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

  svg.call(zoom);

  renderTreeElements(g, treeData, onPersonClick);
}

// Render multiple trees side by side (forest layout)
function renderForestLayout(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  rootTrees: VisualizationPerson[],
  dimensions: { width: number; height: number },
  onPersonClick?: (person: VisualizationPerson | Person, event?: MouseEvent) => void
) {
  const treeWidth = Math.max(300, dimensions.width / rootTrees.length - 50);
  const treeHeight = dimensions.height - 100;

  // Create main group for forest
  const forestGroup = svg
    .append('g')
    .attr('transform', 'translate(25, 50)');

  // Add zoom and pan functionality for entire forest
  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.3, 2])
    .on('zoom', (event) => {
      forestGroup.attr('transform', event.transform);
    });

  svg.call(zoom);

  // Render each tree
  rootTrees.forEach((rootTree, index) => {
    // Create tree layout for this individual tree
    const treeLayout = d3.tree<VisualizationPerson>()
      .size([treeWidth - 50, treeHeight])
      .separation((a, b) => {
        const aHasSpouses = a.data.spouses && a.data.spouses.length > 0;
        const bHasSpouses = b.data.spouses && b.data.spouses.length > 0;
        return (aHasSpouses || bHasSpouses) ? 1.5 : 1;
      });

    const root = d3.hierarchy(rootTree);
    const treeData = treeLayout(root) as TreeNode;

    // Create group for this tree positioned horizontally
    const treeGroup = forestGroup
      .append('g')
      .attr('class', `tree-${index}`)
      .attr('transform', `translate(${index * treeWidth}, 0)`);

    // Add subtle background for each tree
    treeGroup
      .append('rect')
      .attr('x', -25)
      .attr('y', -25)
      .attr('width', treeWidth - 25)
      .attr('height', treeHeight + 50)
      .attr('fill', '#f8fafc')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 1)
      .attr('rx', 8);

    renderTreeElements(treeGroup, treeData, onPersonClick);
  });
}

interface SpouseConnection {
  person: VisualizationPerson;
  spouse: VisualizationPerson;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Common function to render tree elements (nodes, links, spouses)
function renderTreeElements(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  treeData: TreeNode,
  onPersonClick?: (person: VisualizationPerson | Person, event?: MouseEvent) => void
) {
  // Draw spouse connections before regular links
  const spouseConnections: SpouseConnection[] = [];

  treeData.descendants().forEach((node: TreeNode) => {
    if (node.data.spouses && node.data.spouses.length > 0) {
      node.data.spouses.forEach((spouse: VisualizationPerson, index: number) => {
        // Position spouses horizontally next to the main person
        const spouseX = node.x + (index + 1) * 120; // 120px spacing between spouses
        const spouseY = node.y;

        spouseConnections.push({
          person: node.data,
          spouse,
          x1: node.x,
          y1: node.y,
          x2: spouseX,
          y2: spouseY
        });
      });
    }
  });

  // Draw spouse connection lines
  g.selectAll('.spouse-link')
    .data(spouseConnections)
    .enter()
    .append('line')
    .attr('class', 'spouse-link')
    .attr('x1', d => d.x1 + 25) // Start from edge of circle
    .attr('y1', d => d.y1)
    .attr('x2', d => d.x2 - 25) // End at edge of circle
    .attr('y2', d => d.y2)
    .attr('stroke', '#e11d48') // Pink color for spouse connections
    .attr('stroke-width', 3)
    .attr('stroke-dasharray', '5,5'); // Dashed line to distinguish from parent-child

  // Draw spouse nodes
  const spouseNodes = g.selectAll('.spouse-node')
    .data(spouseConnections)
    .enter()
    .append('g')
    .attr('class', 'spouse-node')
    .attr('transform', d => `translate(${d.x2}, ${d.y2})`)
    .style('cursor', 'pointer')
    .on('click', (event: MouseEvent, d: SpouseConnection) => {
      event.stopPropagation();
      if (onPersonClick) {
        onPersonClick(d.spouse, event);
      }
    });

  // Add spouse circles
  spouseNodes.append('circle')
    .attr('r', 25)
    .attr('fill', (d) => {
      const gender = d.spouse.gender;
      return gender === 'M' ? '#3B82F6' : gender === 'F' ? '#EC4899' : '#6B7280';
    })
    .attr('stroke', '#e11d48')
    .attr('stroke-width', 3)
    .on('mouseover', function () {
      d3.select(this).attr('r', 30);
    })
    .on('mouseout', function () {
      d3.select(this).attr('r', 25);
    });

  // Add spouse names
  spouseNodes.append('text')
    .attr('dy', 45)
    .attr('text-anchor', 'middle')
    .text(d => `${d.spouse.first_name} ${d.spouse.last_name}`)
    .attr('fill', '#374151')
    .attr('font-size', '12px')
    .attr('font-weight', '500');

  // Add spouse birth year if available
  spouseNodes.append('text')
    .attr('dy', 60)
    .attr('text-anchor', 'middle')
    .text(d => {
      if (d.spouse.birth_date) {
        const year = new Date(d.spouse.birth_date).getFullYear();
        return `(${year})`;
      }
      return '';
    })
    .attr('fill', '#6B7280')
    .attr('font-size', '10px');

  // Draw links (connections between people)
  g.selectAll('.link')
    .data(treeData.links())
    .enter()
    .append('path')
    .attr('class', 'link')
    .attr('d', d3.linkVertical<any, TreeNode>()
      .x((d: TreeNode) => d.x)
      .y((d: TreeNode) => d.y)
    )
    .attr('fill', 'none')
    .attr('stroke', '#ccc')
    .attr('stroke-width', 2);

  // Draw person nodes
  const nodes = g.selectAll('.node')
    .data(treeData.descendants())
    .enter()
    .append('g')
    .attr('class', 'node')
    .attr('transform', (d: TreeNode) => `translate(${d.x}, ${d.y})`)
    .style('cursor', 'pointer')
    .on('click', (event: MouseEvent, d: TreeNode) => {
      event.stopPropagation();
      if (onPersonClick) {
        onPersonClick(d.data, event);
      }
    });

  // Add person circles
  nodes.append('circle')
    .attr('r', 25)
    .attr('fill', (d: TreeNode) => {
      const gender = d.data.gender;
      return gender === 'M' ? '#3B82F6' : gender === 'F' ? '#EC4899' : '#6B7280';
    })
    .attr('stroke', '#fff')
    .attr('stroke-width', 3)
    .on('mouseover', function () {
      d3.select(this).attr('r', 30);
    })
    .on('mouseout', function () {
      d3.select(this).attr('r', 25);
    });

  // Add person names
  nodes.append('text')
    .attr('dy', 45)
    .attr('text-anchor', 'middle')
    .text((d: TreeNode) => `${d.data.first_name} ${d.data.last_name}`)
    .attr('fill', '#374151')
    .attr('font-size', '12px')
    .attr('font-weight', '500');

  // Add birth year if available
  nodes.append('text')
    .attr('dy', 60)
    .attr('text-anchor', 'middle')
    .text((d: TreeNode) => {
      if (d.data.birth_date) {
        const year = new Date(d.data.birth_date).getFullYear();
        return `(${year})`;
      }
      return '';
    })
    .attr('fill', '#6B7280')
    .attr('font-size', '10px');
}