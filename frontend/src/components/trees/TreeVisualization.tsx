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
  showLegend?: boolean;
  showControls?: boolean;
  className?: string;
}

// Spacing Constants
const NODE_RADIUS = 36;
const SPOUSE_SPACING = 130;
const HORIZONTAL_SPACING = 150; // Reduced from 180
const VERTICAL_SPACING = 150; // Reduced from 150
const WHEEL_ZOOM_SENSITIVITY = 0.0003;

function getNodeLabelLines(fullName?: string): string[] {
  if (!fullName) return [''];

  const maxCharsPerLine = 12;
  const maxLines = 2;
  const words = fullName.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return [''];

  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
      return;
    }

    if (current) {
      lines.push(current);
      current = '';
    }

    if (word.length <= maxCharsPerLine) {
      current = word;
    } else {
      lines.push(`${word.slice(0, maxCharsPerLine - 3)}...`);
    }
  });

  if (current) lines.push(current);

  if (lines.length <= maxLines) return lines;

  const trimmed = lines.slice(0, maxLines);
  const last = trimmed[maxLines - 1];
  trimmed[maxLines - 1] = last.length > maxCharsPerLine - 3
    ? `${last.slice(0, maxCharsPerLine - 3)}...`
    : `${last}...`;
  return trimmed;
}

function getWheelZoomDelta(event: WheelEvent): number {
  const modeFactor = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 120 : 1;
  return -event.deltaY * modeFactor * WHEEL_ZOOM_SENSITIVITY;
}

export function TreeVisualization({ 
  people, 
  relationships = [], 
  onPersonClick, 
  showLegend = true,
  showControls = true,
  className = '' 
}: TreeVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1500 });
  const [rootTreesCount, setRootTreesCount] = useState(1);

  useEffect(() => {
    if (!svgRef.current || people.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    // Create hierarchy data structure - get all root trees
    const rootTrees = createMultipleHierarchies(people, relationships);
    setRootTreesCount(rootTrees.length);

    // If single tree, use existing logic
    if (rootTrees.length === 1) {
      zoomBehaviorRef.current = renderSingleTree(svg, rootTrees[0], showLegend, onPersonClick);
    } else {
      // Render multiple trees side by side (forest layout)
      zoomBehaviorRef.current = renderForestLayout(svg, rootTrees, showLegend, onPersonClick);
    }

  }, [people, relationships, dimensions, onPersonClick, showLegend]);

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

  const handleZoomIn = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(220)
      .call(zoomBehaviorRef.current.scaleBy as any, 1.2);
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(220)
      .call(zoomBehaviorRef.current.scaleBy as any, 0.8);
  };

  const handleResetView = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(250)
      .call(zoomBehaviorRef.current.transform as any, d3.zoomIdentity);
  };

  return (
    <div className={`w-full h-full overflow-hidden relative ${className}`}>
      <svg
        ref={svgRef}
        className="w-full h-full border border-gray-200 rounded-lg bg-white block"
      >
      </svg>

      {/* Controls */}
      {showControls && (
        <div className="absolute top-4 right-4 flex gap-2" data-html2canvas-ignore="true">
          <button
            onClick={handleZoomOut}
            className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
            title="Zoom out"
          >
            -
          </button>
          <button
            onClick={handleZoomIn}
            className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
            title="Zoom in"
          >
            +
          </button>
          <button
            onClick={handleResetView}
            className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            Reset View
          </button>
        </div>
      )}

      {/* Legend - Hidden by default in normal view if requested, and always ignored by html2canvas */}
      {showLegend && showControls && (
        <div className="absolute bottom-4 left-4 bg-white border border-gray-200 rounded-lg p-3 shadow-sm" data-html2canvas-ignore="true">
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
      )}
    </div>
  );
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
  showLegend: boolean,
  onPersonClick?: (person: VisualizationPerson | Person, event?: MouseEvent) => void
): d3.ZoomBehavior<SVGSVGElement, unknown> {
  // Create tree layout with dynamic spacing
  const treeLayout = d3.tree<VisualizationPerson>()
    .nodeSize([HORIZONTAL_SPACING, VERTICAL_SPACING])
    .separation((a, b) => {
      // Calculate how many spouses are between these two nodes
      const aSpouses = a.data.spouses ? a.data.spouses.length : 0;
      
      // Base separation is 1.0 (one HORIZONTAL_SPACING)
      // We add extra space based on the number of spouses the left node has
      const baseSep = a.parent === b.parent ? 1.0 : 1.25;
      const extraSep = (aSpouses * SPOUSE_SPACING) / HORIZONTAL_SPACING;
      
      return baseSep + extraSep;
    });

  const root = d3.hierarchy(hierarchyData);
  const treeData = treeLayout(root) as TreeNode;

  // Calculate bounding box to set viewBox
  const nodes = treeData.descendants();
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  nodes.forEach(node => {
    // Current node boundaries
    minX = Math.min(minX, node.x - NODE_RADIUS - 20);
    maxX = Math.max(maxX, node.x + NODE_RADIUS + 20);
    minY = Math.min(minY, node.y - NODE_RADIUS - 20);
    maxY = Math.max(maxY, node.y + NODE_RADIUS + 58);

    // Spouse boundaries
    if (node.data.spouses) {
      node.data.spouses.forEach((_, i) => {
        const spouseX = node.x + (i + 1) * SPOUSE_SPACING;
        minX = Math.min(minX, spouseX - NODE_RADIUS - 20);
        maxX = Math.max(maxX, spouseX + NODE_RADIUS + 20);
      });
    }
  });

  if (showLegend) {
    maxY += 100; // Extra space for integrated legend at the bottom
  }

  const width = maxX - minX;
  const height = maxY - minY;

  // Set viewBox for the SVG to encompass the entire tree
  svg.attr('viewBox', `${minX} ${minY} ${width} ${height}`);
  svg.attr('width', '100%');
  svg.attr('height', '100%');
  svg.style('max-width', '100%');
  svg.style('height', '100%');
  svg.style('cursor', 'grab');

  // Create group for the tree
  const g = svg.append('g');

  // Add zoom and pan functionality
  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.35, 16])
    .wheelDelta(getWheelZoomDelta)
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

  svg.call(zoom);
  svg.on('mousedown', () => svg.style('cursor', 'grabbing'));
  svg.on('mouseup', () => svg.style('cursor', 'grab'));
  svg.on('mouseleave', () => svg.style('cursor', 'grab'));

  renderTreeElements(g, treeData, onPersonClick);

  if (showLegend) {
    renderSVGLegend(g, minX, maxY - 80);
  }

  return zoom;
}

// Render multiple trees side by side (forest layout)
function renderForestLayout(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  rootTrees: VisualizationPerson[],
  showLegend: boolean,
  onPersonClick?: (person: VisualizationPerson | Person, event?: MouseEvent) => void
): d3.ZoomBehavior<SVGSVGElement, unknown> {
  // Create main group for forest
  const forestGroup = svg.append('g');

  // Add zoom and pan functionality for entire forest
  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.35, 16])
    .wheelDelta(getWheelZoomDelta)
    .on('zoom', (event) => {
      forestGroup.attr('transform', event.transform);
    });

  svg.call(zoom);
  svg.style('cursor', 'grab');
  svg.on('mousedown', () => svg.style('cursor', 'grabbing'));
  svg.on('mouseup', () => svg.style('cursor', 'grab'));
  svg.on('mouseleave', () => svg.style('cursor', 'grab'));

  let currentOffsetX = 0;
  let overallMaxX = 0, overallMinY = Infinity, overallMaxY = -Infinity;

  // Render each tree
  rootTrees.forEach((rootTree, index) => {
    const treeLayout = d3.tree<VisualizationPerson>()
      .nodeSize([HORIZONTAL_SPACING, VERTICAL_SPACING])
      .separation((a, b) => {
        const aSpouses = a.data.spouses ? a.data.spouses.length : 0;
        const extraSep = (aSpouses * SPOUSE_SPACING) / HORIZONTAL_SPACING;
        return (a.parent === b.parent ? 1.0 : 1.25) + extraSep;
      });

    const root = d3.hierarchy(rootTree);
    const treeData = treeLayout(root) as TreeNode;

    // Calculate bounding box for this tree
    const nodes = treeData.descendants();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    nodes.forEach(node => {
      minX = Math.min(minX, node.x - NODE_RADIUS - 20);
      maxX = Math.max(maxX, node.x + NODE_RADIUS + 20);
      minY = Math.min(minY, node.y - NODE_RADIUS - 20);
      maxY = Math.max(maxY, node.y + NODE_RADIUS + 58);

      if (node.data.spouses) {
        node.data.spouses.forEach((_, i) => {
          const spouseX = node.x + (i + 1) * SPOUSE_SPACING;
          maxX = Math.max(maxX, spouseX + NODE_RADIUS + 20);
        });
      }
    });

    const treeWidth = maxX - minX;

    // Create group for this tree positioned horizontally
    const treeGroup = forestGroup
      .append('g')
      .attr('class', `tree-${index}`)
      .attr('transform', `translate(${currentOffsetX - minX}, 0)`);

    // Add background for each tree
    treeGroup
      .append('rect')
      .attr('x', minX - 10)
      .attr('y', minY - 10)
      .attr('width', treeWidth + 20)
      .attr('height', (maxY - minY) + 20)
      .attr('fill', '#f8fafc')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 1)
      .attr('rx', 8);

    renderTreeElements(treeGroup, treeData, onPersonClick);

    // Update overall bounding box
    overallMaxX = Math.max(overallMaxX, currentOffsetX + treeWidth);
    overallMinY = Math.min(overallMinY, minY);
    overallMaxY = Math.max(overallMaxY, maxY);

    // Increment offset for next tree with some gap
    currentOffsetX += treeWidth + 100;
  });

  if (showLegend) {
    overallMaxY += 100;
  }

  // Set viewBox for the entire forest
  svg.attr('viewBox', `0 ${overallMinY - 50} ${overallMaxX + 100} ${overallMaxY - overallMinY + 100}`);
  
  if (showLegend) {
    renderSVGLegend(forestGroup, 0, overallMaxY - 80);
  }
  svg.attr('width', '100%');
  svg.attr('height', '100%');
  svg.style('max-width', '100%');
  svg.style('height', '100%');

  return zoom;
}

function renderSVGLegend(g: d3.Selection<SVGGElement, unknown, null, undefined>, x: number, y: number) {
  const legend = g.append('g')
    .attr('class', 'svg-legend')
    .attr('transform', `translate(${x + 20}, ${y})`);

  legend.append('text')
    .attr('font-size', '14px')
    .attr('font-weight', 'bold')
    .attr('fill', '#111827')
    .text('Legend');

  const items = [
    { label: 'Male', color: '#3B82F6', type: 'circle' },
    { label: 'Female', color: '#3CB030FF', type: 'circle' },
    { label: 'Other', color: '#6B7280', type: 'circle' },
    { label: 'Spouse', color: '#e11d48', type: 'line' }
  ];

  items.forEach((item, i) => {
    const itemG = legend.append('g')
      .attr('transform', `translate(${i * 100}, 25)`);

    if (item.type === 'circle') {
      itemG.append('circle')
        .attr('r', 6)
        .attr('fill', item.color);
    } else {
      itemG.append('line')
        .attr('x1', -8)
        .attr('y1', 0)
        .attr('x2', 8)
        .attr('y2', 0)
        .attr('stroke', item.color)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '3,2');
    }

    itemG.append('text')
      .attr('x', 15)
      .attr('y', 4)
      .attr('font-size', '12px')
      .attr('fill', '#374151')
      .text(item.label);
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
        const spouseX = node.x + (index + 1) * SPOUSE_SPACING;
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
    .attr('x1', d => d.x1 + NODE_RADIUS)
    .attr('y1', d => d.y1)
    .attr('x2', d => d.x2 - NODE_RADIUS)
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
      if (onPersonClick && d.spouse) {
        onPersonClick(d.spouse, event);
      }
    });

  // Add spouse circles
  spouseNodes.append('circle')
    .attr('r', NODE_RADIUS)
    .attr('fill', (d) => {
      const gender = d.spouse?.gender;
      return gender === 'M' ? '#3B82F6' : gender === 'F' ? '#3CB030FF' : '#6B7280';
    })
    .attr('stroke', '#e11d48')
    .attr('stroke-width', 3)
    .on('mouseover', function () {
      d3.select(this).attr('r', NODE_RADIUS + 4);
    })
    .on('mouseout', function () {
      d3.select(this).attr('r', NODE_RADIUS);
    });

  // Add spouse names inside circles
  spouseNodes.append('text')
    .attr('dy', 0)
    .attr('text-anchor', 'middle')
    .attr('fill', '#ffffff')
    .attr('font-size', '11px')
    .attr('font-weight', '700')
    .each(function(d) {
      const text = d3.select(this);
      const lines = getNodeLabelLines(d.spouse?.full_name);
      text.text(null);

      lines.forEach((line, i) => {
        text.append('tspan')
          .attr('x', 0)
          .attr('dy', lines.length === 1 ? '0.35em' : (i === 0 ? '-0.15em' : '1.15em'))
          .text(line);
      });
    });

  spouseNodes.append('title').text(d => d.spouse?.full_name || '');

  // Add spouse birth year if available
  spouseNodes.append('text')
    .attr('dy', NODE_RADIUS + 16)
    .attr('text-anchor', 'middle')
    .text(d => {
      if (d.spouse && d.spouse.birth_date) {
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
    .attr('d', d3.linkVertical<d3.HierarchyPointLink<VisualizationPerson>, TreeNode>()
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
    .attr('r', NODE_RADIUS)
    .attr('fill', (d: TreeNode) => {
      const gender = d.data?.gender;
      return gender === 'M' ? '#3B82F6' : gender === 'F' ? '#3CB030FF' : '#6B7280';
    })
    .attr('stroke', '#fff')
    .attr('stroke-width', 3)
    .on('mouseover', function () {
      d3.select(this).attr('r', NODE_RADIUS + 4);
    })
    .on('mouseout', function () {
      d3.select(this).attr('r', NODE_RADIUS);
    });

  // Add person names inside circles
  nodes.append('text')
    .attr('dy', 0)
    .attr('text-anchor', 'middle')
    .attr('fill', '#ffffff')
    .attr('font-size', '11px')
    .attr('font-weight', '700')
    .each(function(d: TreeNode) {
      const text = d3.select(this);
      const lines = getNodeLabelLines(d.data?.full_name);
      text.text(null);

      lines.forEach((line, i) => {
        text.append('tspan')
          .attr('x', 0)
          .attr('dy', lines.length === 1 ? '0.35em' : (i === 0 ? '-0.15em' : '1.15em'))
          .text(line);
      });
    });

  nodes.append('title').text((d: TreeNode) => d.data?.full_name || '');

  // Add birth year if available
  nodes.append('text')
    .attr('dy', NODE_RADIUS + 16)
    .attr('text-anchor', 'middle')
    .text((d: TreeNode) => {
      if (d.data && d.data.birth_date) {
        const year = new Date(d.data.birth_date).getFullYear();
        return `(${year})`;
      }
      return '';
    })
    .attr('fill', '#6B7280')
    .attr('font-size', '10px');
}
