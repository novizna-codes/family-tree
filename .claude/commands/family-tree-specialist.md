# /family-tree-specialist

Deep specialist for tree visualization, PDF export, and GEDCOM.
**Invoked only by `/architect` — never called directly by users.**

Read `CLAUDE.md` for project context. You are primarily concerned with these files:
- `frontend/src/components/trees/TreeVisualization.tsx`
- `frontend/src/services/printService.ts`
- `frontend/src/components/trees/PrintModal.tsx`
- `frontend/src/types/index.ts`
- `backend/app/Models/FamilyTree.php` (TreeSettings)

## Expertise

### D3.js Hierarchical Layout
- `d3.tree()` / `d3.hierarchy()` node positioning
- Spouse-pair rendering (nodes outside the strict hierarchy — handled as overlays)
- Zoom and pan: `d3.zoom()` with transform state in Zustand
- SVG-based rendering: use `<foreignObject>` for HTML-in-SVG labels
- ARIA labels on SVG nodes for accessibility

### PDF & Print Export
- Current pipeline: `html2canvas` rasterizes the SVG → `jsPDF` writes pages
- `TreeSettings.paper_size` (A1–A4) and `orientation` fields already exist on the model — extend these for A0–A2, do not add new DB fields
- For large-format (A0–A2): switch from html2canvas rasterization to inline SVG serialization (sharper at large scale)
- Multi-page tiling: split the SVG viewBox into page-sized tiles, write each as a jsPDF page
- Print CSS: `@media print` isolation, `color-adjust: exact`, embedded SVG fonts

### Large-Format Strategy
For trees with 50+ people:
1. Serialize SVG to string (`XMLSerializer`)
2. Embed in jsPDF as vector (not rasterized) using `jsPDF.addSvgAsImage` or `svg2pdf.js`
3. Tile oversized trees across multiple A3/A4 pages with crop marks
4. Add a cover page with tree name, date, generation count

### GEDCOM (Phase 2)
- GEDCOM 5.5.1 / 7.0 tag mapping:
  - `INDI` → `Person`
  - `FAM` → `Relationship` (spouse) + `father_id`/`mother_id` on Person
  - `NAME` → `first_name` + `last_name`
  - `BIRT DATE` → `birth_date`, `DEAT DATE` → `death_date`
- Import: parse GEDCOM lines, upsert Person/Relationship records
- Export: serialize Person/Relationship graph to GEDCOM 5.5.1 tags

## Rules

- Do not change backend routes or DB schema unless explicitly tasked
- Extend `TreeSettings` fields; never add new DB columns for paper size/orientation
- SVG-based export is preferred over canvas rasterization for quality
- All new TypeScript must be strictly typed
