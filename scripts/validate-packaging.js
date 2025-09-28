#!/usr/bin/env node
/**
 * Pre-Publishing Validation Script
 * 
 * Validates that all required files and dependencies are present
 * before publishing the EVTX Viewer extension to the marketplace.
 */

const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(color, message) {
    console.log(`${color}${message}${colors.reset}`);
}

function checkFileExists(filePath, description) {
    const exists = fs.existsSync(filePath);
    if (exists) {
        log(colors.green, `✓ ${description}: ${filePath}`);
    } else {
        log(colors.red, `✗ ${description}: ${filePath} (MISSING)`);
    }
    return exists;
}

function checkDirectoryExists(dirPath, description) {
    const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    if (exists) {
        log(colors.green, `✓ ${description}: ${dirPath}`);
    } else {
        log(colors.red, `✗ ${description}: ${dirPath} (MISSING)`);
    }
    return exists;
}

function checkPackageJson() {
    log(colors.blue, '\n📋 Checking package.json...');
    
    const packagePath = 'package.json';
    if (!checkFileExists(packagePath, 'Package manifest')) {
        return false;
    }
    
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Check required fields
    const requiredFields = ['name', 'version', 'main', 'engines', 'contributes'];
    let allFieldsPresent = true;
    
    requiredFields.forEach(field => {
        if (packageData[field]) {
            log(colors.green, `✓ Required field: ${field}`);
        } else {
            log(colors.red, `✗ Missing required field: ${field}`);
            allFieldsPresent = false;
        }
    });
    
    // Check webpack dependencies
    const webpackDeps = ['webpack', 'webpack-cli', 'ts-loader', 'html-webpack-plugin'];
    webpackDeps.forEach(dep => {
        if (packageData.devDependencies && packageData.devDependencies[dep]) {
            log(colors.green, `✓ Webpack dependency: ${dep}`);
        } else {
            log(colors.red, `✗ Missing webpack dependency: ${dep}`);
            allFieldsPresent = false;
        }
    });
    
    // Check scripts
    const requiredScripts = ['compile', 'build:webview', 'vscode:prepublish'];
    requiredScripts.forEach(script => {
        if (packageData.scripts && packageData.scripts[script]) {
            log(colors.green, `✓ Required script: ${script}`);
        } else {
            log(colors.red, `✗ Missing script: ${script}`);
            allFieldsPresent = false;
        }
    });
    
    return allFieldsPresent;
}

function checkCompiledFiles() {
    log(colors.blue, '\n🔨 Checking compiled files...');
    
    let allPresent = true;
    
    // Check main extension file
    allPresent &= checkFileExists('out/src/extension.js', 'Main extension');
    
    // Check webview bundle
    allPresent &= checkFileExists('out/webview/webview.js', 'Webview bundle');
    allPresent &= checkFileExists('out/webview/webview.html', 'Webview HTML');
    
    // Check compiled providers
    allPresent &= checkDirectoryExists('out/src/extension/providers', 'Extension providers');
    allPresent &= checkDirectoryExists('out/src/parsers', 'EVTX parsers');
    
    return allPresent;
}

function checkResources() {
    log(colors.blue, '\n🖼️ Checking resources...');
    
    let allPresent = true;
    
    allPresent &= checkFileExists('resources/icon.png', 'Extension icon');
    allPresent &= checkFileExists('language-configuration.json', 'Language configuration');
    
    return allPresent;
}

function checkVsCodeIgnore() {
    log(colors.blue, '\n🚫 Checking .vscodeignore...');
    
    if (!checkFileExists('.vscodeignore', 'VS Code ignore file')) {
        return false;
    }
    
    const content = fs.readFileSync('.vscodeignore', 'utf8');
    
    // Check that source files are excluded
    const shouldExclude = ['src/**', 'tests/**', 'webpack.config.js', 'tsconfig.json'];
    const shouldInclude = ['!out/**/*.js', '!out/**/*.html', '!resources/**'];
    
    let valid = true;
    
    shouldExclude.forEach(pattern => {
        if (content.includes(pattern)) {
            log(colors.green, `✓ Excludes: ${pattern}`);
        } else {
            log(colors.red, `✗ Should exclude: ${pattern}`);
            valid = false;
        }
    });
    
    shouldInclude.forEach(pattern => {
        if (content.includes(pattern)) {
            log(colors.green, `✓ Includes: ${pattern}`);
        } else {
            log(colors.yellow, `⚠ Should include: ${pattern}`);
        }
    });
    
    return valid;
}

function main() {
    log(colors.blue, '🔍 EVTX Viewer Extension - Pre-Publishing Validation\n');
    
    const checks = [
        { name: 'Package.json', fn: checkPackageJson },
        { name: 'Compiled Files', fn: checkCompiledFiles },
        { name: 'Resources', fn: checkResources },
        { name: 'VS Code Ignore', fn: checkVsCodeIgnore }
    ];
    
    let allPassed = true;
    
    for (const check of checks) {
        const result = check.fn();
        allPassed &= result;
    }
    
    log(colors.blue, '\n📊 Validation Summary:');
    
    if (allPassed) {
        log(colors.green, '✅ All checks passed! Extension is ready for publishing.');
        process.exit(0);
    } else {
        log(colors.red, '❌ Some checks failed. Please fix the issues before publishing.');
        log(colors.yellow, '\n💡 Common fixes:');
        log(colors.yellow, '   • Run: npm run compile && npm run build:webview');
        log(colors.yellow, '   • Check that all dependencies are installed');
        log(colors.yellow, '   • Verify all required files exist');
        process.exit(1);
    }
}

main();