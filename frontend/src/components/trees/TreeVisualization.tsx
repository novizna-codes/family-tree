import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { Person } from '@/types';

interface TreeNode extends d3.HierarchyNode<any> {
  x: number;
  y: number;
}

interface Relationship {
  id: string;
  person1_id: string;
  person2_id: string;
  relationship_type: string;
  relationship_role?: string;
}

interface TreeVisualizationProps {
  people: Person[];
  relationships?: Relationship[];
  onPersonClick?: (person: Person, event?: any) => void;
  className?: string;
}

export function TreeVisualization({ people, relationships = [], onPersonClick, className = '' }: TreeVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (!svgRef.current || people.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    // Create hierarchy data structure
    const hierarchyData = createHierarchy(people, relationships);

    // Create tree layout with more horizontal space for spouses
    const treeLayout = d3.tree<Person & { spouses?: Person[] }>()
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

    // Draw spouse connections before regular links
    const spouseConnections: any[] = [];
    
    treeData.descendants().forEach((node: TreeNode) => {
      if (node.data.spouses && node.data.spouses.length > 0) {
        node.data.spouses.forEach((spouse: any, index: number) => {
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
      .on('click', (event, d) => {
        event.stopPropagation();
        if (onPersonClick) {
          onPersonClick(d.spouse, event.sourceEvent);
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
      .on('mouseover', function() {
        d3.select(this).attr('r', 30);
      })
      .on('mouseout', function() {
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
      .on('click', (event, d) => {
        event.stopPropagation();
        if (onPersonClick) {
          onPersonClick(d.data, event.sourceEvent);
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
      .on('mouseover', function() {
        d3.select(this).attr('r', 30);
      })
      .on('mouseout', function() {
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
        <button
          onClick={() => {
            const svg = d3.select(svgRef.current);
            svg.transition().duration(300).call(
              d3.zoom<SVGSVGElement, unknown>().transform as any,
              d3.zoomIdentity.scale(1)
            );
          }}
          className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
        >
          Reset View
        </button>
      </div>
      
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
            <div className="w-4 h-1 bg-pink-600" style={{borderTop: '2px dashed #e11d48'}}></div>
            <span>Spouse</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to create hierarchy from flat array of people with spouse relationships
function createHierarchy(people: Person[], relationships: Relationship[] = []): any {
  if (people.length === 0) {
    return { 
      id: '', 
      family_tree_id: '',
      first_name: 'Empty', 
      last_name: null,
      maiden_name: null,
      nickname: null,
      gender: null,
      birth_date: null,
      death_date: null,
      birth_place: null,
      death_place: null,
      is_living: true,
      father_id: null,
      mother_id: null,
      photo_path: null,
      notes: null,
      created_at: '',
      updated_at: '',
      children: [],
      spouses: []
    } as any;
  }

  // Create a map for quick lookup
  const personMap = new Map<string, any>();
  
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

  // Find root candidates (people with no parents in the tree)
  const roots: any[] = [];
  const processedIds = new Set<string>();

  people.forEach(person => {
    const personWithChildren = personMap.get(person.id)!;
    
    // Check if this person has parents in the tree
    const hasParentsInTree = people.some(p => 
      p.id === person.father_id || p.id === person.mother_id
    );

    if (!hasParentsInTree && !processedIds.has(person.id)) {
      roots.push(personWithChildren);
      processedIds.add(person.id);
      
      // Also exclude their spouses from being roots since they'll be shown with this person
      personWithChildren.spouses.forEach((spouse: any) => {
        processedIds.add(spouse.id);
      });
    }
  });

  // Build parent-child relationships
  people.forEach(person => {
    // Find children for this person
    const children = people.filter(p => 
      p.father_id === person.id || p.mother_id === person.id
    );
    
    const personWithChildren = personMap.get(person.id)!;
    personWithChildren.children = children.map(child => personMap.get(child.id)!);
  });

  // If we have multiple roots, create a virtual root
  if (roots.length > 1) {
    const virtualRoot: any = {
      id: 'virtual-root',
      family_tree_id: people[0]?.family_tree_id || '',
      first_name: 'Family Tree',
      last_name: '',
      maiden_name: null,
      nickname: null,
      gender: 'O',
      birth_date: null,
      birth_place: null,
      death_date: null,
      death_place: null,
      is_living: true,
      notes: null,
      father_id: null,
      mother_id: null,
      photo_path: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      children: roots,
      spouses: []
    };
    return virtualRoot;
  } else if (roots.length === 1) {
    return roots[0];
  } else {
    // If no clear roots (circular references), just take the first person
    return personMap.get(people[0].id) || { ...people[0], children: [], spouses: [] };
  }
}