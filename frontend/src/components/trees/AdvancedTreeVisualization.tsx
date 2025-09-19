import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import type { CompleteTreeResponse, TreeNode, TreeStructure } from '@/types';

interface AdvancedTreeVisualizationProps {
  treeData: CompleteTreeResponse;
  onPersonClick?: (personId: string, event?: any) => void;
  className?: string;
}

type ViewMode = 'hierarchy' | 'network' | 'timeline';

interface ViewControls {
  mode: ViewMode;
  focusPersonId: string | null;
  maxGenerations: number;
  showSpouses: boolean;
  showDetails: boolean;
  collapsedNodes: Set<string>;
}

export function AdvancedTreeVisualization({ 
  treeData, 
  onPersonClick, 
  className = '' 
}: AdvancedTreeVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [controls, setControls] = useState<ViewControls>({
    mode: 'hierarchy',
    focusPersonId: null,
    maxGenerations: 5,
    showSpouses: true,
    showDetails: true,
    collapsedNodes: new Set()
  });

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
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main render effect
  useEffect(() => {
    if (!svgRef.current || !treeData?.structure?.roots?.length) return;

    console.log('🎨 Rendering tree visualization', { 
      mode: controls.mode, 
      roots: treeData.structure.roots.length,
      dimensions,
      stats: treeData.stats
    });

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Filter and prepare data based on controls
    const filteredData = prepareFilteredData(treeData.structure, controls);

    console.log('📊 Filtered data prepared', {
      originalRoots: treeData.structure.roots.length,
      filteredRoots: filteredData.roots.length
    });

    // Render based on view mode
    switch (controls.mode) {
      case 'hierarchy':
        console.log('🌳 Rendering hierarchy view');
        renderHierarchyView(svg, filteredData, dimensions, controls, onPersonClick);
        break;
      case 'network':
        console.log('🕸️ Rendering network view');
        renderNetworkView(svg, filteredData, dimensions, controls, onPersonClick);
        break;
      case 'timeline':
        console.log('📅 Rendering timeline view');
        renderTimelineView(svg, filteredData, dimensions, controls, onPersonClick);
        break;
    }

  }, [treeData, controls, dimensions, onPersonClick]);

  // Control handlers
  const handleModeChange = useCallback((mode: ViewMode) => {
    setControls(prev => ({ ...prev, mode }));
  }, []);

  const handleFocusChange = useCallback((personId: string | null) => {
    setControls(prev => ({ ...prev, focusPersonId: personId }));
  }, []);

  const handleGenerationChange = useCallback((maxGenerations: number) => {
    setControls(prev => ({ ...prev, maxGenerations }));
  }, []);

  const resetView = useCallback(() => {
    const svg = d3.select(svgRef.current);
    svg.transition().duration(500).call(
      d3.zoom<SVGSVGElement, unknown>().transform as any,
      d3.zoomIdentity.scale(1)
    );
  }, []);

  return (
    <div className={`w-full h-full relative overflow-hidden ${className}`}>
      {/* Loading indicator */}
      {(!treeData?.structure?.roots || !treeData.structure.roots.length) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading visualization...</p>
            {treeData && (
              <div className="mt-2 text-xs text-gray-500">
                <p>Debug: {JSON.stringify(treeData?.structure ? 'Structure exists' : 'No structure')}</p>
                <p>Roots: {treeData?.structure?.roots?.length || 0}</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Controls Panel */}
      <div className="absolute top-4 left-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-10 min-w-64">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Visualization Controls</h3>
        
        {/* View Mode */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-2">View Mode</label>
          <div className="grid grid-cols-3 gap-1">
            {(['hierarchy', 'network', 'timeline'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => handleModeChange(mode)}
                data-mode={mode}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  controls.mode === mode
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Focus Person */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-2">Focus Person</label>
          <select
            value={controls.focusPersonId || ''}
            onChange={(e) => handleFocusChange(e.target.value || null)}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="">All People</option>
            {treeData.structure.roots.map((node) => (
              <option key={node.id} value={node.id}>
                {node.person.first_name} {node.person.last_name || ''}
              </option>
            ))}
          </select>
        </div>

        {/* Generation Limit */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Max Generations ({controls.maxGenerations})
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={controls.maxGenerations}
            onChange={(e) => handleGenerationChange(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Toggle Options */}
        <div className="space-y-2">
          <label className="flex items-center text-xs">
            <input
              type="checkbox"
              checked={controls.showSpouses}
              onChange={(e) => setControls(prev => ({ ...prev, showSpouses: e.target.checked }))}
              className="mr-2"
            />
            Show Spouses
          </label>
          <label className="flex items-center text-xs">
            <input
              type="checkbox"
              checked={controls.showDetails}
              onChange={(e) => setControls(prev => ({ ...prev, showDetails: e.target.checked }))}
              className="mr-2"
            />
            Show Details
          </label>
        </div>
        
        {/* Debug Info */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <div>Mode: {controls.mode}</div>
            <div>Roots: {treeData?.structure?.roots?.length || 0}</div>
            <div>People: {treeData?.stats?.total_people || 0}</div>
            <div>Size: {dimensions.width}x{dimensions.height}</div>
          </div>
        </div>
      </div>

      {/* Main Visualization */}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="border border-gray-200 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50"
      />

      {/* Action Buttons */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={resetView}
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
          {controls.showSpouses && (
            <div className="flex items-center gap-2 mt-1">
              <div className="w-4 h-1 bg-pink-600 border-t-2 border-dashed border-pink-600"></div>
              <span>Spouse</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-gray-400"></div>
            <span>Parent-Child</span>
          </div>
        </div>
      </div>

        {/* Stats Panel */}
        <div className="absolute bottom-4 right-4 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <div className="text-sm font-medium text-gray-900 mb-2">Statistics</div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Total People: {treeData.stats.total_people}</div>
            <div>Total Relationships: {treeData.stats.total_relationships}</div>
            <div>Generations: {treeData.stats.generations_span}</div>
            <div>Min Generation: {treeData.structure.metadata.min_generation}</div>
            <div>Max Generation: {treeData.structure.metadata.max_generation}</div>
          </div>
        </div>
    </div>
  );
}

// Helper function to filter data based on controls
function prepareFilteredData(treeData: TreeStructure, controls: ViewControls): TreeStructure {
  let filteredRoots = [...treeData.roots];
  let filteredRelationshipMap = { ...treeData.relationship_map };

  // Filter by focus person if specified
  if (controls.focusPersonId) {
    const focusNode = findNodeInRoots(treeData.roots, controls.focusPersonId);
    if (focusNode) {
      // Get all related people within generation limit
      const relatedIds = getRelatedPeople(focusNode, treeData, controls.maxGenerations);
      filteredRoots = filterRootsByRelatedIds(treeData.roots, relatedIds);
      filteredRelationshipMap = filterRelationshipMap(treeData.relationship_map, relatedIds);
    }
  }

  // Filter collapsed nodes
  if (controls.collapsedNodes.size > 0) {
    // Remove children of collapsed nodes
    const collapsedChildrenIds = new Set<string>();
    controls.collapsedNodes.forEach(nodeId => {
      const node = findNodeInRoots(filteredRoots, nodeId);
      if (node) {
        node.children.forEach(child => {
          addDescendants(child, collapsedChildrenIds);
        });
      }
    });
    
    filteredRoots = filterRootsByExcludedIds(filteredRoots, collapsedChildrenIds);
    filteredRelationshipMap = filterRelationshipMap(filteredRelationshipMap, new Set(
      Object.keys(filteredRelationshipMap).filter(id => !collapsedChildrenIds.has(id))
    ));
  }

  // Filter spouse relationships if disabled
  if (!controls.showSpouses) {
    filteredRoots = removeSpousesFromRoots(filteredRoots);
  }

  return {
    ...treeData,
    roots: filteredRoots,
    relationship_map: filteredRelationshipMap
  };
}

// Helper function to get related people within generation limit
function getRelatedPeople(focusNode: TreeNode, treeData: TreeStructure, maxGenerations: number): Set<string> {
  const relatedIds = new Set<string>([focusNode.id]);
  const visited = new Set<string>();
  
  function traverse(nodeId: string, currentGeneration: number) {
    if (currentGeneration >= maxGenerations || visited.has(nodeId)) return;
    
    visited.add(nodeId);
    relatedIds.add(nodeId);
    
    const node = findNodeInRoots(treeData.roots, nodeId);
    if (!node) return;
    
    // Add parents, children, spouses
    [...node.parents, ...node.children, ...node.spouses].forEach(related => {
      const relatedId = typeof related === 'string' ? related : related.id;
      if (!visited.has(relatedId)) {
        traverse(relatedId, currentGeneration + 1);
      }
    });
  }
  
  traverse(focusNode.id, 0);
  return relatedIds;
}

// Helper function to add all descendants of a node
function addDescendants(node: TreeNode, targetSet: Set<string>) {
  targetSet.add(node.id);
  node.children.forEach(child => {
    addDescendants(child, targetSet);
  });
}

// Helper function to find a node in roots by ID
function findNodeInRoots(roots: TreeNode[], nodeId: string): TreeNode | null {
  for (const root of roots) {
    const found = findNodeRecursive(root, nodeId);
    if (found) return found;
  }
  return null;
}

// Helper function to find a node recursively
function findNodeRecursive(node: TreeNode, nodeId: string): TreeNode | null {
  if (node.id === nodeId) return node;
  
  for (const child of node.children) {
    const found = findNodeRecursive(child, nodeId);
    if (found) return found;
  }
  
  return null;
}

// Helper function to filter roots by related IDs
function filterRootsByRelatedIds(roots: TreeNode[], relatedIds: Set<string>): TreeNode[] {
  return roots.map(root => filterNodeByRelatedIds(root, relatedIds)).filter(Boolean) as TreeNode[];
}

// Helper function to filter a node by related IDs
function filterNodeByRelatedIds(node: TreeNode, relatedIds: Set<string>): TreeNode | null {
  if (!relatedIds.has(node.id)) return null;
  
  return {
    ...node,
    children: node.children.map(child => filterNodeByRelatedIds(child, relatedIds)).filter(Boolean) as TreeNode[]
  };
}

// Helper function to filter roots by excluded IDs
function filterRootsByExcludedIds(roots: TreeNode[], excludedIds: Set<string>): TreeNode[] {
  return roots.map(root => filterNodeByExcludedIds(root, excludedIds)).filter(Boolean) as TreeNode[];
}

// Helper function to filter a node by excluded IDs
function filterNodeByExcludedIds(node: TreeNode, excludedIds: Set<string>): TreeNode | null {
  if (excludedIds.has(node.id)) return null;
  
  return {
    ...node,
    children: node.children.map(child => filterNodeByExcludedIds(child, excludedIds)).filter(Boolean) as TreeNode[]
  };
}

// Helper function to filter relationship map
function filterRelationshipMap(relationshipMap: Record<string, any[]>, allowedIds: Set<string>): Record<string, any[]> {
  const filtered: Record<string, any[]> = {};
  
  for (const [personId, relationships] of Object.entries(relationshipMap)) {
    if (allowedIds.has(personId)) {
      filtered[personId] = relationships.filter(rel => allowedIds.has(rel.person_id));
    }
  }
  
  return filtered;
}

// Helper function to remove spouses from roots
function removeSpousesFromRoots(roots: TreeNode[]): TreeNode[] {
  return roots.map(root => removeSpousesFromNode(root));
}

// Helper function to remove spouses from a node
function removeSpousesFromNode(node: TreeNode): TreeNode {
  return {
    ...node,
    spouses: [],
    children: node.children.map(child => removeSpousesFromNode(child))
  };
}

// Hierarchy View Renderer
function renderHierarchyView(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  data: TreeStructure,
  dimensions: { width: number; height: number },
  controls: ViewControls,
  onPersonClick?: (personId: string, event?: any) => void
) {
  try {
    // Use the filtered root nodes
    const rootNodes = data.roots;
    
    if (rootNodes.length === 0) {
      console.warn('No root nodes to render in hierarchy view');
      return;
    }
    
    console.log('🌳 Building hierarchy from', rootNodes.length, 'root(s)');
    
    // Create hierarchy for first root (can be enhanced for multiple roots)
    const root = buildHierarchyFromNode(rootNodes[0], data);
    
    // Create tree layout
    const treeLayout = d3.tree<any>()
      .size([dimensions.width - 200, dimensions.height - 100])
      .separation((a: any, b: any) => {
        const aHasSpouses = controls.showSpouses && a.data.spouses.length > 0;
        const bHasSpouses = controls.showSpouses && b.data.spouses.length > 0;
        return (aHasSpouses || bHasSpouses) ? 2 : 1;
      });

    const hierarchyRoot = d3.hierarchy(root);
    const treeData = treeLayout(hierarchyRoot);

    // Create main group with zoom
    const g = svg
      .append('g')
      .attr('transform', 'translate(100, 50)');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Render tree elements
    renderHierarchyElements(g, treeData, controls, onPersonClick);
    
    console.log('✅ Hierarchy view rendered successfully');
  } catch (error) {
    console.error('❌ Error rendering hierarchy view:', error);
  }
}

// Network View Renderer  
function renderNetworkView(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  data: TreeStructure,
  dimensions: { width: number; height: number },
  controls: ViewControls,
  onPersonClick?: (personId: string, event?: any) => void
) {
  // Flatten the tree structure to get all nodes
  const allNodes = flattenTreeNodes(data.roots);
  
  // Create relationships array from the tree structure
  const relationships = createRelationshipsFromNodes(allNodes);

  // Create force simulation
  const simulation = d3.forceSimulation(allNodes as any)
    .force('link', d3.forceLink(relationships).id((d: any) => d.id).distance(80))
    .force('charge', d3.forceManyBody().strength(-200))
    .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
    .force('collision', d3.forceCollide().radius(35));

  const g = svg.append('g');

  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.3, 3])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

  svg.call(zoom);

  // Render network elements
  renderNetworkElements(g, { roots: allNodes, relationship_map: data.relationship_map, metadata: data.metadata, people_map: data.people_map }, simulation, controls, onPersonClick, relationships);
}

// Timeline View Renderer
function renderTimelineView(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  data: TreeStructure,
  dimensions: { width: number; height: number },
  controls: ViewControls,
  onPersonClick?: (personId: string, event?: any) => void
) {
  // Flatten the tree structure to get all nodes
  const allNodes = flattenTreeNodes(data.roots);
  
  // Sort nodes by birth date
  const nodesWithDates = allNodes
    .filter(node => node.person.birth_date)
    .sort((a, b) => new Date(a.person.birth_date!).getTime() - new Date(b.person.birth_date!).getTime());

  if (nodesWithDates.length === 0) return;

  const earliestDate = new Date(nodesWithDates[0].person.birth_date!);
  const latestDate = new Date(nodesWithDates[nodesWithDates.length - 1].person.birth_date!);

  // Create time scale
  const timeScale = d3.scaleTime()
    .domain([earliestDate, latestDate])
    .range([100, dimensions.width - 100]);

  const g = svg.append('g');

  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.5, 5])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

  svg.call(zoom);

  // Render timeline elements
  renderTimelineElements(g, nodesWithDates, timeScale, dimensions, controls, onPersonClick);
}

// Helper function to build hierarchy from tree node
function buildHierarchyFromNode(node: TreeNode, data: TreeStructure): any {
  try {
    console.log('Building hierarchy for node:', {
      id: node.id,
      name: node.person.first_name + ' ' + (node.person.last_name || ''),
      children: node.children.length
    });
    
    const hierarchyNode = {
      ...node,
      children: node.children.map(child => buildHierarchyFromNode(child, data)).filter(Boolean)
    };

    return hierarchyNode;
  } catch (error) {
    console.error('Error building hierarchy for node:', node.id, error);
    return {
      ...node,
      children: []
    };
  }
}

// Hierarchy elements renderer
function renderHierarchyElements(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  treeData: d3.HierarchyPointNode<any>,
  controls: ViewControls,
  onPersonClick?: (personId: string, event?: any) => void
) {
  // Draw links
  g.selectAll('.link')
    .data(treeData.links())
    .enter()
    .append('path')
    .attr('class', 'link')
    .attr('d', d3.linkVertical<any, any>()
      .x(d => d.x)
      .y(d => d.y)
    )
    .attr('fill', 'none')
    .attr('stroke', '#94a3b8')
    .attr('stroke-width', 2);

  // Draw nodes
  const nodes = g.selectAll('.node')
    .data(treeData.descendants())
    .enter()
    .append('g')
    .attr('class', 'node')
    .attr('transform', d => `translate(${d.x}, ${d.y})`)
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      event.stopPropagation();
      if (onPersonClick) {
        onPersonClick(d.data.id, event);
      }
    });

  // Add circles for people
  nodes.append('circle')
    .attr('r', 20)
    .attr('fill', d => getPersonColor(d.data.person.gender))
    .attr('stroke', '#fff')
    .attr('stroke-width', 3)
    .on('mouseover', function() {
      d3.select(this).attr('r', 25);
    })
    .on('mouseout', function() {
      d3.select(this).attr('r', 20);
    });

  // Add names
  nodes.append('text')
    .attr('dy', 35)
    .attr('text-anchor', 'middle')
    .text(d => `${d.data.person.first_name} ${d.data.person.last_name}`)
    .attr('fill', '#374151')
    .attr('font-size', '11px')
    .attr('font-weight', '500');

  // Add birth year if showing details
  if (controls.showDetails) {
    nodes.append('text')
      .attr('dy', 48)
      .attr('text-anchor', 'middle')
      .text(d => {
        if (d.data.person.birth_date) {
          const year = new Date(d.data.person.birth_date).getFullYear();
          return `(${year})`;
        }
        return '';
      })
      .attr('fill', '#6B7280')
      .attr('font-size', '9px');
  }
}

// Network elements renderer
function renderNetworkElements(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  data: TreeStructure,
  simulation: d3.Simulation<any, undefined>,
  _controls: ViewControls,
  onPersonClick?: (personId: string, event?: any) => void,
  relationships?: any[]
) {
  const links = relationships || [];
  const nodes = data.roots;

  // Draw links
  const linkSelection = g.selectAll('.link')
    .data(links)
    .enter()
    .append('line')
    .attr('class', 'link')
    .attr('stroke', (d: any) => d.type === 'spouse' ? '#e11d48' : '#94a3b8')
    .attr('stroke-width', (d: any) => d.type === 'spouse' ? 3 : 2)
    .attr('stroke-dasharray', (d: any) => d.type === 'spouse' ? '5,5' : 'none');

  // Draw nodes
  const nodeSelection = g.selectAll('.node')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', 'node')
    .style('cursor', 'pointer')
    .call(d3.drag<any, any>()
      .on('start', (event, d: any) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d: any) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d: any) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      })
    )
    .on('click', (event, d: any) => {
      event.stopPropagation();
      if (onPersonClick) {
        onPersonClick(d.id, event);
      }
    });

  // Add circles
  nodeSelection.append('circle')
    .attr('r', 20)
    .attr('fill', (d: any) => getPersonColor(d.person.gender))
    .attr('stroke', '#fff')
    .attr('stroke-width', 3);

  // Add names
  nodeSelection.append('text')
    .attr('dy', 30)
    .attr('text-anchor', 'middle')
    .text((d: any) => `${d.person.first_name} ${d.person.last_name || ''}`)
    .attr('fill', '#374151')
    .attr('font-size', '10px')
    .attr('font-weight', '500');

  // Update positions on simulation tick
  simulation.on('tick', () => {
    linkSelection
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y);

    nodeSelection.attr('transform', (d: any) => `translate(${d.x}, ${d.y})`);
  });
}

// Timeline elements renderer
function renderTimelineElements(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  nodes: TreeNode[],
  timeScale: d3.ScaleTime<number, number, never>,
  dimensions: { width: number; height: number },
  _controls: ViewControls,
  onPersonClick?: (personId: string, event?: any) => void
) {
  // Draw timeline axis
  const timeAxis = d3.axisBottom(timeScale).tickFormat(d3.timeFormat('%Y') as any);
  
  g.append('g')
    .attr('class', 'time-axis')
    .attr('transform', `translate(0, ${dimensions.height - 100})`)
    .call(timeAxis as any);

  // Group nodes by generation/family line
  const generations = groupNodesByGeneration(nodes);
  const generationHeight = (dimensions.height - 200) / generations.length;

  // Draw nodes
  generations.forEach((generationNodes, index) => {
    const y = 50 + index * generationHeight;
    
    const nodeGroups = g.selectAll(`.generation-${index}`)
      .data(generationNodes)
      .enter()
      .append('g')
      .attr('class', `generation-${index}`)
      .attr('transform', (d: any) => `translate(${timeScale(new Date(d.person.birth_date!))}, ${y})`)
      .style('cursor', 'pointer')
      .on('click', (event, d: any) => {
        event.stopPropagation();
        if (onPersonClick) {
          onPersonClick(d.id, event);
        }
      });

    // Add circles
    nodeGroups.append('circle')
      .attr('r', 15)
      .attr('fill', (d: any) => getPersonColor(d.person.gender))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add names
    nodeGroups.append('text')
      .attr('dy', -20)
      .attr('text-anchor', 'middle')
      .text((d: any) => `${d.person.first_name} ${d.person.last_name || ''}`)
      .attr('fill', '#374151')
      .attr('font-size', '10px')
      .attr('font-weight', '500');
  });
}

// Helper function to group nodes by generation
function groupNodesByGeneration(nodes: TreeNode[]): TreeNode[][] {
  // Simple grouping by birth decade for timeline view
  const decades = new Map<number, TreeNode[]>();
  
  nodes.forEach(node => {
    if (node.person.birth_date) {
      const decade = Math.floor(new Date(node.person.birth_date).getFullYear() / 10) * 10;
      if (!decades.has(decade)) {
        decades.set(decade, []);
      }
      decades.get(decade)!.push(node);
    }
  });
  
  return Array.from(decades.values());
}

// Helper function to get person color based on gender
function getPersonColor(gender: string | null): string {
  switch (gender) {
    case 'M':
      return '#3B82F6'; // Blue
    case 'F':
      return '#EC4899'; // Pink
    default:
      return '#6B7280'; // Gray
  }
}

// Helper function to flatten tree nodes
function flattenTreeNodes(roots: TreeNode[]): TreeNode[] {
  const allNodes: TreeNode[] = [];
  
  function addNode(node: TreeNode) {
    allNodes.push(node);
    node.children.forEach(child => addNode(child));
  }
  
  roots.forEach(root => addNode(root));
  return allNodes;
}

// Helper function to create relationships from nodes
function createRelationshipsFromNodes(nodes: TreeNode[]): any[] {
  const relationships: any[] = [];
  
  nodes.forEach(node => {
    // Parent-child relationships
    node.children.forEach(child => {
      relationships.push({
        source: node.id,
        target: child.id,
        type: 'parent-child'
      });
    });
    
    // Spouse relationships
    node.spouses.forEach(spouse => {
      relationships.push({
        source: node.id,
        target: spouse.id,
        type: 'spouse'
      });
    });
  });
  
  return relationships;
}