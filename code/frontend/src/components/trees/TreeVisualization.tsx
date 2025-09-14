import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { Person } from '@/types';

interface TreeNode extends d3.HierarchyNode<Person> {
  x: number;
  y: number;
}

interface TreeVisualizationProps {
  people: Person[];
  onPersonClick?: (person: Person, event?: any) => void;
  className?: string;
}

export function TreeVisualization({ people, onPersonClick, className = '' }: TreeVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (!svgRef.current || people.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    // Create hierarchy data structure
    const hierarchyData = createHierarchy(people);

    // Create tree layout
    const treeLayout = d3.tree<Person>()
      .size([dimensions.width - 100, dimensions.height - 100]);

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

    // Draw links (connections between people)
    const links = g.selectAll('.link')
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

  }, [people, dimensions, onPersonClick]);

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
              d3.zoom<SVGSVGElement, unknown>().transform,
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
        </div>
      </div>
    </div>
  );
}

// Helper function to create hierarchy from flat array of people
function createHierarchy(people: Person[]): Person & { children?: Person[] } {
  if (people.length === 0) {
    return { id: '', first_name: 'Empty', children: [] } as Person & { children?: Person[] };
  }

  // Create a map for quick lookup
  const personMap = new Map<string, Person & { children: Person[] }>();
  
  // Initialize all people in the map with children array
  people.forEach(person => {
    personMap.set(person.id, { ...person, children: [] });
  });

  // Find root candidates (people with no parents in the tree)
  const roots: (Person & { children: Person[] })[] = [];
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
    return {
      id: 'virtual-root',
      first_name: 'Family Tree',
      last_name: '',
      children: roots
    } as Person & { children: Person[] };
  } else if (roots.length === 1) {
    return roots[0];
  } else {
    // If no clear roots (circular references), just take the first person
    return personMap.get(people[0].id) || { ...people[0], children: [] };
  }
}