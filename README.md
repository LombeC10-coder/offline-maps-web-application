# Offline Maps Web Application

A browser-based offline maps prototype built as my final year project. The application explores how map data can be loaded, parsed and rendered in the browser without relying on a constant internet connection.

The project focuses on low-connectivity environments, where access to geographic information may be limited. It demonstrates frontend engineering, offline-first design, map data processing, modular JavaScript architecture and browser-based rendering.

## Project Overview

The application allows users to load OpenStreetMap-style map data and render it directly in the browser. It uses modular JavaScript components for parsing, projection, rendering, file loading and point-of-interest extraction.

The project was developed through a series of prototypes and experiments before being structured into a working offline map application.

## Features

- Browser-based offline map prototype
- Loads and renders OpenStreetMap-style map data
- HTML5 Canvas-based map rendering
- Service worker support for offline access
- Web worker used for map data parsing
- Point-of-interest extraction
- Spatial indexing for map data
- Map projection and view-fitting utilities
- Local file loading through the browser
- Prototype folders showing earlier development experiments
- Documentation, screenshots and evaluation material

## Technologies Used

- JavaScript
- HTML
- CSS
- HTML5 Canvas
- Service Workers
- Web Workers
- OpenStreetMap-style data
- Git and GitHub
- VS Code Live Server

## Project Structure

```text
offline-maps-web-application/
├── README.md
├── diary.md
├── package.json
├── package-lock.json
├── product/
│   ├── app/
│   │   ├── README.md
│   │   ├── index.html
│   │   ├── sw.js
│   │   ├── src/
│   │   │   ├── geo/
│   │   │   │   ├── projection.js
│   │   │   │   └── projection.manualtest.js
│   │   │   ├── map/
│   │   │   │   ├── osmParser.js
│   │   │   │   ├── poiExtractor.js
│   │   │   │   └── spatialIndex.js
│   │   │   ├── render/
│   │   │   │   ├── mapRenderer.js
│   │   │   │   └── viewFit.js
│   │   │   ├── ui/
│   │   │   │   └── fileLoader.js
│   │   │   ├── worker/
│   │   │   │   └── osmParseWorker.js
│   │   │   └── main.js
│   │   └── styles/
│   │       └── main.css
│   ├── data/
│   │   ├── lusaka-lite.json
│   │   └── zambia-demo/
│   ├── docs/
│   │   ├── README.md
│   │   ├── diagrams/
│   │   ├── evaluation/
│   │   └── screenshots/
│   ├── prototypes/
│   │   ├── canvas-drawing/
│   │   ├── indexeddb-todo/
│   │   ├── offline-hello-world/
│   │   └── osm-raw/
│   └── test-map.json
└── scripts/
    └── preprocess-osm.cjs
```

## How to Run

This project can be run locally using the **Live Server** extension in Visual Studio Code.

### 1. Open the project in VS Code

```bash
code offline-maps-web-application
```

Or open it manually:

```text
File → Open Folder → offline-maps-web-application
```

### 2. Open the main application file

Navigate to:

```text
product/app/index.html
```

### 3. Start Live Server

Right-click `index.html` and select:

```text
Open with Live Server
```

This will open the application in your browser using a local development server, usually at:

```text
http://127.0.0.1:5500/product/app/index.html
```

or:

```text
http://localhost:5500/product/app/index.html
```

### 4. Use the application

Once opened in the browser, the application can load and render the included sample map data or a supported `.osm` file through the file loading interface.

Running through Live Server is recommended because browser features such as service workers, file loading and offline behaviour work more reliably through a local server than by opening the HTML file directly.

## Test Map Data

The project includes small sample data files for testing the offline map renderer.

Example files:

```text
product/data/lusaka-lite.json
product/test-map.json
```

These files are used to test loading, parsing and rendering map data in the browser.

Large `.osm` or `.pbf` files are not included in this repository to keep the project lightweight. To test with your own map data, place the file inside a suitable folder such as:

```text
product/data/osm/
```

Then open the application using Live Server and load the file through the browser interface.

## Large Data File Policy

OpenStreetMap files can become very large, so this repository is designed to include only small sample files.

Recommended `.gitignore` rules:

```gitignore
# Dependencies
node_modules/

# Build output
dist/
build/

# Environment variables / secrets
.env
.env.local

# Logs
*.log
npm-debug.log*

# OS files
.DS_Store

# IDE files
.idea/
.vscode/

# Cache
.cache/

# Large map files
*.osm
*.pbf

# Allow one small sample OSM file if needed
!product/data/osm/lusaka-sample.osm
```

If a small `.osm` file is included for demonstration, it should be renamed clearly, for example:

```text
product/data/osm/lusaka-sample.osm
```

## Skills Demonstrated

This project demonstrates:

- Frontend engineering
- Offline-first web development
- Modular JavaScript architecture
- Browser API usage
- Service worker implementation
- Web worker implementation
- HTML5 Canvas rendering
- OpenStreetMap-style data handling
- Map projection and view fitting
- Point-of-interest extraction
- Spatial indexing
- Performance-aware design
- Independent research and development
- Technical documentation and evaluation

## Development Process

The project was developed through multiple stages:

1. Early browser and offline prototypes
2. Canvas drawing experiments
3. Raw OSM data loading experiments
4. Map parsing and data processing
5. Rendering and projection development
6. Offline shell and service worker support
7. Documentation, screenshots and evaluation

The `prototypes/` folder shows earlier experiments that helped guide the final application structure.

## Notes

This project was originally developed as part of my final year university project and has been cleaned for portfolio use.

It is included to demonstrate frontend engineering, problem-solving, documentation, offline-first development and the ability to break a complex technical problem into smaller modular components.

## Future Improvements

Planned improvements include:

- Improving support for larger map files
- Adding stronger error messages for unsupported files
- Improving the map interaction controls
- Adding zoom and pan improvements
- Adding more detailed point-of-interest filtering
- Improving mobile responsiveness
- Adding automated tests for parser and projection logic
- Adding clearer screenshots and usage examples