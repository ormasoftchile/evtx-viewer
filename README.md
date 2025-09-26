# EVTX Viewer - VS Code Extension

A Visual Studio Code extension for viewing, filtering, searching, and exporting Windows Event Log (.evtx) files.

## Features

- **Open EVTX Files**: Seamlessly open .evtx files directly in VS Code
- **Browse Events**: Navigate through Windows Event Log entries with an intuitive interface
- **Advanced Filtering**: Filter events by level, source, event ID, and date range
- **Full-Text Search**: Search across all event fields and descriptions
- **Export Capabilities**: Export filtered results to CSV, JSON, or XML formats
- **High Performance**: Efficient parsing and virtual scrolling for large log files

## Installation

> **Note**: This extension is currently in development.

1. Install from the VS Code Marketplace (coming soon)
2. Or install from VSIX package

## Usage

1. Open a `.evtx` file in VS Code
2. The EVTX Viewer will automatically activate
3. Use the integrated viewer to browse, filter, and search events
4. Export your results using the export functionality

## Development

This project follows constitutional principles for code quality, testing, user experience, performance, and security.

### Requirements

- Node.js 18+
- VS Code 1.80+
- TypeScript 5.x

### Setup

```bash
npm install
npm run compile
```

### Testing

```bash
npm test
```

### Build

```bash
npm run package
```

## Architecture

- **TypeScript**: Type-safe development
- **VS Code Extension API**: Core extension functionality
- **React**: Webview UI components
- **Binary Parsing**: High-performance EVTX file parsing
- **Virtual Scrolling**: Efficient handling of large datasets

## Performance Targets

- Parsing throughput: >10MB/sec
- Memory usage: <512MB for typical files
- UI response time: <100ms

## Contributing

Please read our [Constitution](/.specify/memory/constitution.md) for development principles and guidelines.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Specification

- [Feature Specification](/specs/001-a-vs-code/spec.md)
- [Implementation Plan](/specs/001-a-vs-code/plan.md)
- [Task Breakdown](/specs/001-a-vs-code/tasks.md)
