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