# Tasks: EVTX Viewer VS Code Extension

**Input**: Design documents from `/Volumes/Projects/specs/001-a-vs-code/`
**Prerequisites**: plan.md (available), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: TypeScript 5.x + Node.js 18+ + VS Code Extension API
   → Extract: VS Code extension structure, binary parsing, webview UI
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: VS Code extension scaffolding, TypeScript config, dependencies
   → Tests: VS Code command tests, parser tests, webview integration tests  
   → Core: EVTX parser, data models, VS Code commands, webview components
   → Integration: Extension host communication, file system access, memory management
   → Polish: performance tests, accessibility, documentation
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All VS Code commands have tests?
   → All parser components have models?
   → All webview components implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
VS Code extension structure as defined in plan.md:
- **Extension code**: `evtx-viewer/src/extension/`, `evtx-viewer/src/parsers/`, `evtx-viewer/src/shared/`
- **Webview code**: `evtx-viewer/src/webview/`
- **Tests**: `evtx-viewer/tests/unit/`, `evtx-viewer/tests/integration/`

## Phase 3.1: Setup
- [x] T001 Create VS Code extension project structure in evtx-viewer/ per implementation plan
- [x] T002 Initialize TypeScript 5.x project with VS Code Extension API dependencies
- [x] T003 [P] Configure ESLint and Prettier for code formatting (constitutional requirement)
- [x] T004 [P] Set up Jest testing framework with VS Code Extension Test Runner
- [x] T005 [P] Configure performance benchmarking framework for parsing speed tests
- [x] T006 [P] Set up GitHub Actions CI/CD pipeline for automated testing

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [x] T007 [P] VS Code command test for "EVTX: Open File" in tests/integration/test_open_file_command.ts
- [x] T008 [P] VS Code command test for "EVTX: Open Folder" in tests/integration/test_open_folder_command.ts  
- [x] T009 [P] VS Code command test for "EVTX: Add File to Current View" in tests/integration/test_add_file_command.ts
- [x] T010 [P] EVTX parser unit tests in tests/unit/test_evtx_parser.ts
- [x] T011 [P] Event record model tests in tests/unit/test_event_record.ts
- [x] T012 [P] Webview message protocol tests in tests/integration/test_webview_communication.ts
- [x] T013 [P] Virtual scrolling performance tests in tests/performance/test_virtual_scrolling.ts ✅ COMPLETED
- [x] T014 [P] Event filter engine unit tests in tests/unit/test_filter_engine.ts ✅ COMPLETED  
- [x] T015 [P] Export functionality integration tests in tests/integration/test_export_functionality.ts ✅ COMPLETED

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [x] T016 [P] EVTX file model in src/parsers/models/evtx_file.ts
- [x] T017 [P] Event record model in src/parsers/models/event_record.ts
- [x] T018 [P] Filter criteria model in src/shared/models/filter_criteria.ts
- [x] T019 [P] Export request model in src/shared/models/export_request.ts
- [x] T020 EVTX binary parser core engine in src/parsers/core/evtx_parser.ts
- [x] T021 Event data extraction service in src/parsers/core/event_extractor.ts
- [x] T022 VS Code "Open File" command implementation in src/extension/commands/open_file.ts
- [x] T023 VS Code "Open Folder" command implementation in src/extension/commands/open_folder.ts
- [x] T024 VS Code "Add File" command implementation in src/extension/commands/add_file.ts
- [x] T025 Webview provider implementation in src/extension/providers/evtx_webview_provider.ts
- [x] T026 Extension activation and command registration in src/extension/extension.ts

## Phase 3.4: Webview UI Components (after core parser working)
- [x] T027 [P] React virtual scrolling grid component in src/webview/components/event_grid.tsx
- [x] T028 [P] Filter panel component in src/webview/components/filter_panel.tsx
- [x] T029 [P] Event details pane component in src/webview/components/event_details.tsx
- [ ] T030 [P] Export dialog component in src/webview/components/export_dialog.tsx
- [x] T031 Webview main application component in src/webview/components/app.tsx
- [x] T032 Webview message handling service in src/webview/services/message_service.ts
- [x] T033 Data formatting utilities in src/webview/utils/format_utils.ts

## Phase 3.5: Integration
- [x] T034 Extension host to webview communication protocol in src/shared/types/webview_messages.ts
- [x] T035 File system access service with progress tracking in src/extension/services/file_service.ts
- [x] T036 Memory management with LRU caching in src/extension/services/memory_manager.ts
- [x] T037 Progress notification service in src/extension/services/progress_service.ts
- [x] T038 Error handling and logging middleware in src/extension/services/error_service.ts
- [x] T039 Security validation for file input in src/extension/services/security_service.ts

## Phase 3.6: Polish
- [x] T040 [P] Performance benchmarks with constitutional targets (>10MB/sec parsing, <512MB memory) in tests/performance/
- [x] T041 [P] Security validation tests for binary parsing in tests/security/test_input_validation.ts
- [x] T042 [P] Accessibility compliance verification for webview components in tests/accessibility/
- [x] T043 [P] Cross-platform compatibility tests in tests/integration/test_cross_platform.ts
- [ ] T044 [P] Update README.md with usage examples and API documentation (constitutional requirement)
- [ ] T045 [P] TSDoc documentation for all public APIs in src/
- [ ] T046 Remove code duplication and final code quality review across all modules
- [ ] T047 End-to-end integration test with sample .evtx files in tests/integration/test_e2e.ts

## Dependencies
- Setup (T001-T006) before all other phases
- Tests (T007-T015) before implementation (T016-T026)
- Parser models (T016-T019) before parser implementation (T020-T021)
- VS Code commands (T022-T024) depend on parser service (T020-T021)
- Webview provider (T025) before webview components (T027-T033)
- Core implementation (T016-T026) before webview UI (T027-T033)
- Integration (T034-T039) after core and UI components
- Polish (T040-T047) after all implementation complete

## Parallel Example
```
# Launch parser model tests together (T010, T011, T014):
Task: "EVTX parser unit tests in tests/unit/test_evtx_parser.ts"
Task: "Event record model tests in tests/unit/test_event_record.ts"  
Task: "Filter engine unit tests in tests/unit/test_filter_engine.ts"

# Launch model implementations in parallel (T016-T019):
Task: "EVTX file model in src/parsers/models/evtx_file.ts"
Task: "Event record model in src/parsers/models/event_record.ts"
Task: "Filter criteria model in src/shared/models/filter_criteria.ts"
Task: "Export request model in src/shared/models/export_request.ts"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify all tests fail before implementing
- VS Code extension requires careful separation between extension host and webview contexts
- Performance targets from constitution: >10MB/sec parsing, <512MB memory, <100ms UI response
- All file paths relative to evtx-viewer/ directory within the larger repository

## Task Generation Rules
*Applied during main() execution*

1. **From VS Code Extension Requirements**:
   - Each command → command test + implementation task
   - Each webview component → component test + implementation task
   
2. **From Parser Requirements**:
   - Each data model → model test + model task [P]
   - Binary parsing → parser engine task
   - Performance requirements → benchmark tasks
   
3. **From User Stories**:
   - Each acceptance scenario → integration test [P]
   - File operations → file service tasks

4. **Ordering**:
   - Setup → Tests → Models → Parser → Commands → UI → Integration → Polish
   - Extension host tasks before webview tasks
   - Communication protocol before dependent components

## Validation Checklist
*GATE: Checked by main() before returning*

- [ ] All VS Code commands have corresponding tests and implementations
- [ ] All data models have test and implementation tasks
- [ ] All webview components have tests and implementations  
- [ ] Parser performance tests include constitutional targets
- [ ] Security validation covers binary file parsing
- [ ] Documentation tasks cover all public APIs
- [ ] Cross-platform compatibility addressed
- [ ] Each task specifies exact file path in evtx-viewer/ directory