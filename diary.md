# Final Year Project Diary – HTML5 Offline Maps Application

---

## Week 5 – 20 Oct to 24 Oct 2025  
### Summary  
Restructured the project plan to align with the official FYP template, clarifying the problem scope, technical direction, and expected deliverables.

### Tasks Completed
- Rewrote project plan using departmental structure.  
- Defined milestones for offline architecture, data processing, and rendering.  
- Identified key risks (performance, dataset size, browser constraints).  
- Standardised Markdown diary structure.  

### Reflections  
Improved clarity on project expectations and reinforced the importance of incremental development and structured planning.

### Next Steps  
- Set up GitLab repository and workflow.  
- Begin initial offline prototype using Service Workers.  

---

## Week 6 – 27 Oct to 31 Oct 2025  
### Summary  
Implemented the first offline prototype using Service Workers, establishing the foundation for offline-first functionality.

### Tasks Completed
- Created project repository and connected to GitLab.  
- Implemented Service Worker registration and caching strategy.  
- Cached core assets (HTML, CSS, JS).  
- Verified offline behaviour using Chrome DevTools.  

### Reflections  
Gained practical understanding of Service Worker lifecycle and caching mechanisms, which are central to enabling offline capability.

### Next Steps  
- Implement IndexedDB prototype for persistent storage.  
- Explore interaction between caching and dynamic data.  

---

## Week 7 – 3 Nov to 7 Nov 2025  
### Summary  
Developed IndexedDB and Canvas prototypes to support offline storage and interactive rendering.

### Tasks Completed
- Built a To-Do application using IndexedDB (CRUD operations).  
- Implemented Canvas drawing tools (rectangles and circles).  
- Added persistence for drawn objects using IndexedDB.  
- Refactored code into modular components.  

### Reflections  
Reinforced the importance of separating data storage from rendering logic. IndexedDB proved suitable for offline persistence, while Canvas enabled flexible graphical rendering.

### Next Steps  
- Begin OpenStreetMap (OSM) data loader prototype.  
- Explore geographic data structures and formats.  

---

## Week 8 – 10 Nov to 14 Nov 2025  
### Summary  
Implemented the OpenStreetMap (OSM) raw data loader, enabling parsing and inspection of geographic datasets.

### Tasks Completed
- Implemented file input with automatic format detection (XML/JSON).  
- Parsed `.osm` XML using DOMParser.  
- Processed Overpass JSON data.  
- Extracted nodes, ways, relations, and tags.  
- Built preview table for inspecting parsed data.  

### Reflections  
Understanding OSM data structures was a key milestone. This highlighted the complexity of converting raw geographic data into renderable features.

### Next Steps  
- Research map projection techniques.  
- Design coordinate transformation pipeline.  

---

## Week 9 – 17 Nov to 21 Nov 2025  
### Summary  
Conducted research into map projections and evaluated OSM datasets to understand scale, density, and performance constraints.

### Tasks Completed
- Investigated methods for converting latitude/longitude into 2D coordinates.  
- Tested multiple OSM extracts to evaluate data variability.  
- Analysed how nodes and ways translate into geometric primitives.  
- Documented scaling and alignment strategies.  

### Reflections  
Identified performance as a key challenge when working with larger datasets. Research provided a foundation for designing a scalable rendering pipeline.

### Next Steps  
- Extend Canvas system to support world coordinates.  
- Begin implementing rendering pipeline.  

---

## Week 10 – 24 Nov to 28 Nov 2025  
### Summary  
Enhanced the Canvas system into a structured rendering engine with world coordinate handling and redraw logic.

### Tasks Completed
- Implemented panning using camera offsets.  
- Added world coordinate tracking and cursor feedback.  
- Built redraw pipeline (clear → grid → shapes).  
- Integrated IndexedDB persistence into rendering workflow.  

### Reflections  
Marked a transition from simple drawing to managing spatial coordinate systems, which is fundamental for map rendering.

### Next Steps  
- Prepare for integration of OSM data into renderer.  

---

## TERM 2 

---

## Week 11 – 19 Jan to 23 Jan 2026  
### Summary  
Implemented the first full OSM-to-Canvas rendering pipeline, transforming raw data into a visual map.

### Tasks Completed
- Reconstructed OSM ways into polylines.  
- Applied highway-based filtering and styling.  
- Loaded and validated Lusaka dataset.  

### Reflections  
This was a major milestone, confirming that the system could convert raw geographic data into meaningful visual output.

### Next Steps  
- Implement pan and zoom functionality.  
- Improve rendering performance.  

---

## Week 12 – 26 Jan to 30 Jan 2026  
### Summary  
Introduced interactive navigation through pan and zoom functionality.

### Tasks Completed
- Implemented view state (scale and translation).  
- Added drag-to-pan interaction.  
- Implemented cursor-centred zoom.  
- Added reset view functionality.  

### Reflections  
Improved usability significantly and reinforced understanding of coordinate transformations between world and screen space.

### Next Steps  
- Implement fit-to-data.  
- Begin performance optimisation.  

---

## Week 13 – 20 Feb to 20 Feb 2026  
### Summary  
Implemented Web Mercator projection to ensure consistent coordinate transformation.

### Tasks Completed
- Developed projection module (lat/lon → projected coordinates).  
- Integrated projection into parsing and rendering pipeline.  
- Updated fit-to-data calculations.  

### Reflections  
Resolved alignment issues and established a consistent coordinate system across the application.

### Next Steps  
- Implement viewport-based culling.  
- Optimise rendering performance.  

---

## Week 14 – 23 Feb to 26 Feb 2026  
### Summary  
Optimised rendering performance and introduced interactive inspection features.

### Tasks Completed
- Implemented viewport-based culling.  
- Added bounding box optimisation for ways.  
- Implemented click-to-inspect functionality.  
- Displayed node metadata via sidebar.  

### Reflections  
Culling significantly improved performance and made the system more scalable for larger datasets.

### Next Steps  
- Implement reverse projection.  
- Enhance UI features.  

---

## Week 15 – 2 Mar to 6 Mar 2026  
### Summary  
Finalised coordinate transformation pipeline and enhanced user interface features.

### Tasks Completed
- Implemented inverse projection (unproject).  
- Added validation tests for projection accuracy.  
- Improved UI (layout and rendering consistency).

### Reflections  
Ensured consistency between rendering and interaction systems, improving reliability.

### Next Steps  
- Improve visual styling.  
- Test with larger datasets.  

---

## Week 16 – 9 Mar to 13 Mar 2026  
### Summary  
Improved the visual quality and usability of the map by transitioning from a debug-style renderer to a more realistic, map-like interface with a full-screen layout.

### Tasks Completed
- Implemented full-screen map layout with responsive canvas resizing.  
- Added resize handling to re-render without reloading data.  
- Synced canvas resolution with display size to prevent distortion.  
- Ensured pan, zoom, and fit-to-data remain stable after resize.  

- Introduced styled base map rendering:  
  - Applied background colour.  
  - Implemented road hierarchy based on highway types.  
  - Scaled styling appropriately with zoom.  

- Added polygon rendering for area features (parks, grass).  
- Reduced prominence of debug overlays.  

### Reflections  
This update significantly improved readability and usability, marking a transition from a prototype interface to a more user-focused map.

### Next Steps  
- Add POI search and landmark interaction.  
- Further refine map styling and performance.  

---

## Week 17 – 16 Mar to 20 Mar 2026  
### Summary  
Extended the renderer to support semantic map features by extracting and displaying Points of Interest (POIs) from OSM data.

### Tasks Completed
- Implemented POI extraction from OSM data (cafes, monuments, attractions).  
- Stored POIs with metadata (id, name, type, coordinates).  
- Rendered POIs using styled markers based on type.  
- Ensured markers remain correctly positioned during pan and zoom.  

- Added UI toggle controls for POI layers (cafes, monuments).  
- Triggered dynamic re-rendering without reloading data.  
- Structured POI data to support future search functionality.  

### Reflections  
This feature introduced semantic interpretation of OSM data, moving beyond geometric rendering. It significantly improved map usability and laid the foundation for search and filtering features.

### Next Steps  
- Implement POI search and filtering.  
- Refine marker styling and visibility across zoom levels.  

---

## Week 18 – 1 Apr to 7 Apr 2026  
### Summary  
Focused on final system polishing and preparation of the project demonstration, including stability improvements and feature validation.

### Tasks Completed
- Refined UI layout and interaction consistency.  
- Fixed minor rendering and styling issues.  
- Validated core features (pan, zoom, search, rendering pipeline).  
- Tested system with larger datasets for stability.  
- Planned and recorded project demo video.  

### Reflections  
This phase ensured the system was stable, coherent, and ready for presentation. Recording the demo helped identify remaining usability issues and areas for refinement.

### Next Steps  
- Finalise remaining UI improvements.  
- Begin report writing and documentation.  

---

## Week 19 – 8 Apr to 15 Apr 2026  
### Summary  
Completed final report writing and overall project polishing, ensuring alignment between implementation, documentation, and evaluation.

### Tasks Completed
- Wrote and refined final report sections (implementation, evaluation, discussion).  
- Integrated diagrams, screenshots, and technical explanations.  
- Reviewed and polished system for submission.  
- Ensured consistency between codebase, report, and demo.  

### Reflections  
This stage consolidated all aspects of the project into a coherent final submission. Aligning the implementation with the report was essential for clearly communicating technical contributions.

### Next Steps  
- Final submission and review.  

---