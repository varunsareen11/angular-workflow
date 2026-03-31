# Angular Workflow Designer

A visual workflow builder built with Angular 21 and [Foblex Flow](https://flow.foblex.com/). Drag and drop nodes onto a canvas, connect them, and export or save your workflow.

## Features

- Drag-and-drop node palette with 5 node types:
  - Start Event
  - End Event
  - Gateway
  - Human in Loop
  - Define Scope
- Draw connections between nodes
- Inline label editing on supported nodes
- Add connected nodes directly from a node's context menu
- Undo / Redo (Ctrl+Z / Ctrl+Y or Cmd+Z / Cmd+Y)
- Zoom in / out and fit-to-screen controls
- Export canvas to JSON
- Import canvas from JSON
- Save workflow via modal (posts to `/api/workflows`)

## Tech Stack

- Angular 21 (standalone components, signals)
- [@foblex/flow](https://www.npmjs.com/package/@foblex/flow) for the canvas engine
- Angular HttpClient for API integration
- TypeScript 5.9

## Getting Started

```bash
npm install
npm start
```

App runs at `http://localhost:4200` and redirects to `/design`.

## Build

```bash
npm run build
```

Output is placed in `dist/`.

## Project Structure

```
src/app/
├── design/
│   ├── design.component.ts       # Main canvas + toolbar logic
│   ├── design.component.html
│   ├── design.component.css
│   └── save-workflow-modal/      # Modal for naming & saving a workflow
├── app.routes.ts
├── app.config.ts
└── app.ts
```

## API

The save modal POSTs the following payload to `/api/workflows`:

```json
{
  "name": "string",
  "description": "string",
  "nodes": [...],
  "connections": [...]
}
```

Replace the endpoint in `save-workflow-modal.component.ts` with your actual backend URL.
