# Binary XML Parser for EVTX Files - Complete Specification

**Version:** 1.0  
**Date:** October 3, 2025  
**Status:** Planning Phase  
**Priority:** Critical - Required for AdditionalInformation extraction

---

## Executive Summary

This specification defines the implementation of a complete Binary XML (BinXML) parser for Windows Event Log (EVTX) files. The current heuristic-based approach fails to extract EventData fields (Error, ErrorMessage, AdditionalInformation) because it attempts pattern matching on binary data where field names exist only in templates, not in the actual event data.

The solution requires implementing a proper BinXML token parser that converts EVTX's proprietary binary XML format into standard text XML, which can then be parsed using existing XML DOM parsers.

---

## Problem Statement

### Current State
- EVTX files use binary XML (BinXML) format with templates and substitutions
- Our parser uses heuristic pattern matching to search for field names in binary data
- **Root Cause**: Field names like "AdditionalInformation" exist in TEMPLATES, not in event data
- Event data contains only VALUES in a substitution array
- Pattern matching cannot find fields that don't exist as strings in the binary

### Required State
- Complete BinXML parser that understands templates and substitution
- Convert binary XML tokens to text XML
- Use existing XML DOM parser on generated XML
- Extract EventData/UserData fields reliably
- Match Windows Event Viewer output exactly

### Reference Implementation
The C# evtx library by Eric Zimmerman provides a proven implementation at:
- /Volumes/Projects/evtx/evtx/EventRecord.cs
- /Volumes/Projects/evtx/evtx/Tags/TemplateInstance.cs
- /Volumes/Projects/evtx/evtx/Tags/TagBuilder.cs
- /Volumes/Projects/evtx/evtx/SubstitutionArrayEntry.cs

See full specification at: /Volumes/Projects/evtx-viewer/specs/003-binary-xml-parser/FULL_SPEC.md
