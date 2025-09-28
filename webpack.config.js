/**
 * Webpack Configuration for EVTX Viewer Webview
 * 
 * Bundles the React webview application for VS Code extension.
 * Outputs to out/webview/ directory with proper CSP compliance.
 */

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    // Development mode for better debugging
    mode: 'production',
    
    // Entry point for the webview
    entry: './src/webview/index.tsx',
    
    // Output configuration
    output: {
        path: path.resolve(__dirname, 'out', 'webview'),
        filename: 'webview.js',
        clean: true
    },
    
    // Module resolution
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.jsx']
    },
    
    // Loaders
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ]
    },
    
    // Plugins
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/webview/template.html',
            filename: 'webview.html',
            minify: {
                removeComments: true,
                collapseWhitespace: true
            }
        })
    ],
    
    // Externals - VS Code webview globals and Node.js modules that should not be bundled
    externals: {
        vscode: 'vscode'
    },
    
    // Target browser environment for webview
    target: 'web',
    
    // Development server settings (not used in extension but good to have)
    devtool: 'source-map',
    
    // Performance optimizations
    optimization: {
        minimize: true
    }
};