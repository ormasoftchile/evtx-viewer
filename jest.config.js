/**
 * Jest Configuration for EVTX Viewer Extension
 * 
 * Configures Jest testing framework for VS Code extension development
 * with TypeScript support and proper environment setup.
 */

module.exports = {
  // Use projects configuration for different test environments
  projects: [
    {
      // Regular tests (unit, integration, security) - Node environment
      displayName: 'node-tests',
      testEnvironment: 'node',
      preset: 'ts-jest',
      
      // TypeScript configuration
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: 'tsconfig.json'
        }],
      },

      // File patterns - exclude accessibility tests
      testMatch: [
        '**/tests/**/*.test.ts',
        '**/tests/**/*.spec.ts',
        '**/tests/integration/test_e2e.ts'
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
        '/out/',
        '/.vscode-test/',
        '/tests/accessibility/'
      ],

      // Module resolution
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      
      // Coverage configuration
      collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/**/index.ts'
      ],

      // Setup files
      setupFilesAfterEnv: [
        '<rootDir>/tests/setup/jest.setup.ts'
      ],

      // Module mapping for VS Code extension development
      moduleNameMapper: {
        '^vscode$': '<rootDir>/tests/__mocks__/vscode.ts'
      },

      // Test timeout
      // timeout: 30000, // Use global timeout instead

      // Additional ignore patterns for Jest haste map
      modulePathIgnorePatterns: [
        '/out/',
        '/.vscode-test/'
      ],
    },
    {
      // Accessibility tests - JSDOM environment
      displayName: 'accessibility-tests',
      testEnvironment: 'jsdom',
      preset: 'ts-jest',
      
      // TypeScript configuration
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: 'tsconfig.json'
        }],
      },

      // File patterns - only accessibility tests
      testMatch: [
        '**/tests/accessibility/**/*.test.ts',
        '**/tests/accessibility/**/*.spec.ts'
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
        '/out/',
        '/.vscode-test/'
      ],

      // Module resolution
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      
      // Setup files
      setupFilesAfterEnv: [
        '<rootDir>/tests/setup/jest.setup.ts'
      ],

      // Module mapping for VS Code extension development
      moduleNameMapper: {
        '^vscode$': '<rootDir>/tests/__mocks__/vscode.ts'
      },

      // Test timeout for accessibility tests
      // timeout: 30000, // Use global timeout instead

      // Additional ignore patterns for Jest haste map
      modulePathIgnorePatterns: [
        '/out/',
        '/.vscode-test/'
      ],

      // JSDOM specific configuration
      testEnvironmentOptions: {
        url: 'http://localhost',
        userAgent: 'Mozilla/5.0 (compatible; JSDOM)'
      },

      // Add global setup for Node.js globals in jsdom
      setupFilesAfterEnv: [
        '<rootDir>/tests/setup/jest.setup.ts',
        '<rootDir>/tests/setup/jsdom.setup.ts'
      ]
    }
  ],

  // Global timeout
  testTimeout: 30000
};