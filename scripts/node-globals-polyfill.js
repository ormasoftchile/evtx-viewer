/**
 * Node.js globals polyfill for vsce packaging
 * Provides missing Web API globals that undici expects
 */

// Add File global that undici expects
if (typeof global.File === 'undefined') {
  global.File = class File extends Blob {
    constructor(fileBits, fileName, options = {}) {
      super(fileBits, options);
      this.name = fileName;
      this.lastModified = options.lastModified || Date.now();
    }
  };
}

// Add Blob if not available
if (typeof global.Blob === 'undefined') {
  global.Blob = class Blob {
    constructor(parts = [], options = {}) {
      this.size = 0;
      this.type = options.type || '';
      if (parts && parts.length > 0) {
        this.size = parts.reduce((acc, part) => {
          if (typeof part === 'string') return acc + part.length;
          if (part instanceof ArrayBuffer) return acc + part.byteLength;
          return acc;
        }, 0);
      }
    }
  };
}

console.log('Node.js globals polyfill loaded for vsce packaging');