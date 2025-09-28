/**
 * Webview Entry Point
 * 
 * Main entry point for the EVTX Viewer webview React application.
 * This file initializes the React app and mounts it to the DOM.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './components/app';

// Initialize the webview application
function initializeWebview() {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
        return;
    }

    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWebview);
} else {
    initializeWebview();
}