/**
 * Jest setup file for EVTX Viewer tests
 * Configures global test environment and mocks
 */
declare const vscode: {
    commands: {
        registerCommand: jest.Mock<any, any, any>;
        executeCommand: jest.Mock<any, any, any>;
    };
    window: {
        showErrorMessage: jest.Mock<any, any, any>;
        showWarningMessage: jest.Mock<any, any, any>;
        showInformationMessage: jest.Mock<any, any, any>;
        showOpenDialog: jest.Mock<any, any, any>;
        createWebviewPanel: jest.Mock<any, any, any>;
        withProgress: jest.Mock<any, any, any>;
    };
    workspace: {
        getConfiguration: jest.Mock<any, any, any>;
        onDidChangeConfiguration: jest.Mock<any, any, any>;
        workspaceFolders: never[];
    };
    Uri: {
        file: jest.Mock<any, any, any>;
        parse: jest.Mock<any, any, any>;
    };
    ViewColumn: {
        One: number;
        Two: number;
        Three: number;
    };
    ExtensionContext: jest.Mock<any, any, any>;
    Disposable: jest.Mock<any, any, any>;
    EventEmitter: jest.Mock<any, any, any>;
    TreeDataProvider: jest.Mock<any, any, any>;
    WebviewPanel: jest.Mock<any, any, any>;
    WebviewOptions: jest.Mock<any, any, any>;
    ProgressLocation: {
        Notification: number;
        SourceControl: number;
        Window: number;
    };
};
declare const originalConsoleError: (message?: any, ...optionalParams: any[]) => void;
//# sourceMappingURL=setup.d.ts.map