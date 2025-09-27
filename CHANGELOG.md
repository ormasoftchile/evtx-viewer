# 1.0.0 (2025-09-27)


### Bug Fixes

* GitHub Actions permissions for version bumping ([57f0735](https://github.com/ormasoftchile/evtx-viewer/commit/57f07359f154661368f7de4defdaee8108815dcb))
* Resolve React component test failures ([6faf68b](https://github.com/ormasoftchile/evtx-viewer/commit/6faf68bbf60f52980b8586e53e51f1bcc2997718))
* Resolve test compilation and linting errors after console.log cleanup ([b87cff4](https://github.com/ormasoftchile/evtx-viewer/commit/b87cff426bf9647f4ff3822fe27fedfb6a0ea315))
* update Node.js version for semantic-release compatibility ([ca31a1a](https://github.com/ormasoftchile/evtx-viewer/commit/ca31a1a24f43f3d99118d614f4a498547e64220e))


### Features

* Complete webview UI overhaul with comprehensive improvements ([a11be90](https://github.com/ormasoftchile/evtx-viewer/commit/a11be900084cae32e8ab69a89667862dcf86b703))
* implement comprehensive version management system ([5b6d3bd](https://github.com/ormasoftchile/evtx-viewer/commit/5b6d3bd7cd773755d01d14818dd54b2105682fc5))

# Changelog

All notable changes to the EVTX Viewer extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive webview UI overhaul with modern React-based interface
- T028 Filter Panel Component with advanced filtering capabilities
- Real-time event log display with virtual scrolling for performance
- Advanced search and filtering functionality
- Event details modal with comprehensive information display
- Export functionality for filtered event data
- Responsive design for different window sizes
- Performance optimizations for large EVTX files
- Security enhancements and input validation
- Comprehensive test suite with Jest integration
- React component testing framework

### Changed
- Complete UI redesign with modern, professional styling
- Improved EVTX file parsing with better error handling
- Enhanced performance for large file processing
- Upgraded TypeScript configuration and build system
- Improved accessibility compliance
- Better memory management for large datasets

### Fixed
- Console.log cleanup throughout codebase for production readiness
- TypeScript compilation errors and linting issues
- React component test execution in Node.js Jest environment
- Case declaration blocks in switch statements
- Return type mismatches and unused variable warnings
- Regex escape character issues and control character patterns
- File signature validation and error handling
- Memory leak prevention in event processing

### Security
- Input validation for EVTX file processing
- Sanitization of event data display
- Protection against malformed file attacks
- Memory bounds checking for large files

## [0.1.0] - 2025-09-27

### Added
- Initial VS Code extension for viewing EVTX files
- Basic EVTX file parser supporting Windows Event Log format
- File association for .evtx files
- Custom editor provider for EVTX files
- Webview-based user interface
- Command palette integration
- Multi-file support capability
- Core event extraction and display functionality

### Technical Improvements
- TypeScript 5.9.2 support with strict type checking
- ESLint configuration with comprehensive rules
- Jest testing framework with TypeScript support
- VS Code API integration with proper error handling
- Binary data parsing with Buffer operations
- XML event data extraction and formatting

### Development Infrastructure
- Complete project structure with organized source code
- Build system with TypeScript compilation
- Testing infrastructure with unit and integration tests
- Git workflow with proper branching strategy
- Documentation and code comments
- Package configuration for VS Code marketplace

---

## Development Notes

### Architecture
- **Extension Host**: VS Code extension running in Node.js environment
- **Webview**: React-based UI running in isolated webview context
- **Parser**: Binary EVTX file parser with XML event extraction
- **Provider**: Custom editor and webview providers for file handling

### Performance Considerations
- Virtual scrolling for handling large event datasets
- Memory-efficient parsing with streaming support
- Constitutional memory limits (500MB default)
- Optimized rendering for 10,000+ events

### Testing Strategy
- Unit tests for core parsing functionality
- Integration tests for end-to-end workflows
- React component testing with proper mocking
- Performance benchmarking for large files

### Browser Compatibility
- Modern ES2022 features with TypeScript compilation
- React 18+ with functional components and hooks
- CSS Grid and Flexbox for responsive layouts
- VS Code webview API compatibility
