/**
 * Webpack Configuration for EVTX Viewer Extension Host
 * 
 * Bundles the extension code for better performance.
 */

const path = require('path');

module.exports = {
    target: 'node',
    mode: 'production',
    
    entry: './src/extension.ts',
    
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2',
        clean: true
    },
    
    externals: {
        vscode: 'commonjs vscode',
        // Don't bundle native modules
        'utf-8-validate': 'commonjs utf-8-validate',
        'bufferutil': 'commonjs bufferutil'
    },
    
    resolve: {
        extensions: ['.ts', '.js'],
        mainFields: ['module', 'main'],
        extensionAlias: {
            '.js': ['.js', '.ts']
        }
    },
    
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: true
                        }
                    }
                ]
            }
        ]
    },
    
    devtool: 'source-map',
    
    optimization: {
        minimize: false // Keep readable for debugging
    }
};
