// Copyright 2021 Tianhuan Lu
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as vscode from "vscode";
const util = require("util");
const path = require("path");

import * as child_process from "child_process";

let zmq: typeof import("zeromq");
try {
    zmq = require("zeromq");
} catch (error) {
    vscode.window.showWarningMessage((error as Error).message);
}

import { deserializeMarkup } from "./markdown-serializer";
import { tex2svg } from "./load-mathjax";
import { ExecutionQueue, ExecutionItem } from "./execution-queue";
import { KernelStatusBarItem, ExportNotebookStatusBarItem } from "./ui-items";
import { WLNotebookOutputPanel } from "./output-panel";
import { NotebookConfig } from "./notebook-config";
import { createWLRendererMessageChannel } from "./renderer-message-channel";
import { fileHandler } from "./file-handler";
import { Disposable } from "./disposable";
import { KernelMessage, WLKernelConnection } from "./kernel-connection";

export class WLNotebookController extends Disposable {
    readonly id = "wolfram-language-notebook-controller";
    readonly notebookType = "wolfram-language-notebook";
    readonly label = 'Wolfram Language';
    readonly supportedLanguages = ["wolfram"];
    readonly extensionId = "njpipeorgan.wolfram-language-notebook";

    readonly extensionPath;
    readonly isInWorkspace;
    readonly config;

    private readonly thisExtension;
    private readonly controller;
    private readonly messageChannel?: vscode.NotebookRendererMessaging;
    private readonly selectedNotebooks: Set<vscode.NotebookDocument> = new Set();

    readonly statusBarKernelItem = new KernelStatusBarItem(this.supportedLanguages);
    readonly statusBarExportItem = new ExportNotebookStatusBarItem();
    readonly kernelConnection = new WLKernelConnection();
    readonly executionQueue = new ExecutionQueue();

    constructor() {
        super();
        this.thisExtension = vscode.extensions.getExtension(this.extensionId)!;
        this.extensionPath = this.thisExtension.extensionPath;
        this.isInWorkspace = this.thisExtension.extensionKind === vscode.ExtensionKind.Workspace;
        this.config = new NotebookConfig(this.isInWorkspace);

        WLNotebookOutputPanel.print(
            `WLNotebookController(), this.isInWorkspace = ${this.isInWorkspace}, this.extensionPath = ${this.extensionPath}`);

        this.controller = vscode.notebooks.createNotebookController(this.id, this.notebookType, this.label);
        this.controller.supportedLanguages = this.supportedLanguages;
        this.controller.supportsExecutionOrder = true;
        this.controller.executeHandler = this.execute.bind(this);
        this.controller.onDidChangeSelectedNotebooks(this.onDidChangeSelectedNotebooks.bind(this));

        this.messageChannel = createWLRendererMessageChannel();
        this.registerDisposable(this.messageChannel);

        // when notebook config changes, send a message to the kernel
        this.config.onDidChange((config: NotebookConfig) => {
            this.kernelConnection.postMessage({ type: "set-config", config: config.getKernelRelatedConfigs() });
        });

        this.registerDisposable(this.statusBarKernelItem, this.statusBarExportItem, this.config);

        this.controller.dispose = () => {
            WLNotebookOutputPanel.print(`The notebook controller is being disposed.`);
            this.quitKernel();
            this.dispose();
        };

        this.kernelConnection.registerMessageHandler(
            "show-input-name",
            new ShowInputNameMessageHandler(this).handleMessage
        );
        this.kernelConnection.registerMessageHandler(
            ["show-output", "show-message", "show-text"],
            new ShowOutputMessageHandler(this).handleMessage
        );
        this.kernelConnection.registerMessageHandler(
            "evaluation-done",
            new EvaluationDoneMessageHandler(this).handleMessage
        );
        this.kernelConnection.registerMessageHandler(
            ["request-input", "request-input-string"],
            new RequestInputMessageHandler(this).handleMessage
        );
        this.kernelConnection.registerMessageHandler(
            "reply-export-notebook",
            new ReplyExportNotebookMessageHandler(this).handleMessage
        );
    }

    getController() {
        return this.controller;
    }

    private showKernelLaunchFailed(kernelName: string = "") {
        WLNotebookOutputPanel.show();
        vscode.window.showErrorMessage(
            `Failed to connect to the kernel${kernelName ? " \"" + kernelName + "\"" : ""}.`,
            "Try Again", "Test in Terminal", "Edit configurations"
        ).then(value => {
            if (value === "Try Again") {
                this.launchKernel(kernelName || undefined);
            } else if (value === "Test in Terminal") {
                this.launchKernel(kernelName || undefined, true);
            } else if (value === "Edit configurations") {
                this.config.revealKernelConfigs();
            }
        });
    }

    private async launchKernelWithName(kernelName: string, kernel: { [key: string]: any }) {
        WLNotebookOutputPanel.clear();

        let connectionTimeout = this.config.get("kernel.connectionTimeout") as number;
        if (!(1000 < connectionTimeout)) {
            connectionTimeout = 1000; // milliseconds
        }

        const resourceDirectory = path.join(this.extensionPath, 'resources');
        const kernelInitPath = path.join(resourceDirectory, 'init-compressed.txt');
        const kernelRenderInitPath = path.join(resourceDirectory, 'render-html.wl');
        let kernelInitString = "";
        let kernelRenderInitString = "";
        try {
            kernelInitString = fileHandler.readSync(kernelInitPath);
            kernelRenderInitString = fileHandler.readSync(kernelRenderInitPath);
        } catch (error) {
            vscode.window.showErrorMessage("Failed to read kernel initialization files.");
            return;
        }

        const result = await this.kernelConnection.launchKernel(kernel, resourceDirectory, connectionTimeout);

        if (!result.succeed) {
            this.showKernelLaunchFailed(kernelName);
            return;
        }

        this.kernelConnection.postMessage({
            type: "evaluate-front-end",
            async: false,
            text: kernelRenderInitString
        });
        this.kernelConnection.postMessage({
            type: "set-config",
            config: this.config.getKernelRelatedConfigs()
        });

        this.statusBarKernelItem.setConnected(result.attributes.version, result.attributes.isRemote);
        try {
            this.handleMessageFromKernel();
        } catch { }
        this.checkoutExecutionQueue();

    };

    private launchKernel(kernelName: string | undefined = undefined, testInTerminal: boolean = false) {
        if (this.kernelConnected()) {
            return;
        }
        this.quitKernel();
        const kernels = this.config.get("kernel.configurations") as any;
        const numKernels = Object.keys(kernels).length;

        if (kernelName === undefined) {
            // let the user choose the kernel
            const withUseWolframscript = (numKernels === 0);
            let leadingPicks: any[] = [];
            if (withUseWolframscript) {
                leadingPicks = [{
                    label: "$(debug-start) Use wolframscript",
                    detail: "Add wolframscript to kernel configurations and connect to it"
                }];
            } else {
                leadingPicks = Object.keys(kernels).map(name => {
                    const host = kernels[name]?.type === "remote" ? String(kernels[name]?.sshHost || "remote") : "local";
                    return {
                        label: `$(debug-start) ${name}`,
                        detail: `${host}> ${String(kernels[name]?.command)}`
                    };
                });
            }
            vscode.window.showQuickPick([
                ...leadingPicks,
                { label: "$(new-file) Add a new kernel", detail: "" },
                { label: "$(notebook-edit) Edit kernel configurations in settings", detail: "" }
            ]).then(value => {
                if (value) {
                    if (withUseWolframscript && value?.label === "$(debug-start) Use wolframscript") {
                        const config = vscode.workspace.getConfiguration("wolframLanguageNotebook");
                        const newKernel = {
                            wolframscript: {
                                type: "local",
                                command: "wolframscript",
                                ports: "49152-65535"
                            }
                        };
                        config.update("kernel.configurations",
                            { ...config.get("kernel.configurations"), ...newKernel },
                            vscode.ConfigurationTarget.Global
                        ).then(() => {
                            // config may not be available yet; add a short delay
                            setTimeout(() => {
                                this.launchKernel("wolframscript", testInTerminal);
                            }, 200);
                        });
                    }
                    else if (value.label.startsWith("$(debug-start)")) {
                        this.launchKernel(value.label.substring(15), testInTerminal);
                    } else if (value.label === "$(new-file) Add a new kernel") {
                        this.addNewKernel();
                    } else if (value.label === "$(notebook-edit) Edit kernel configurations in settings") {
                        this.config.revealKernelConfigs();
                    }
                }
            });
        } else {
            // try to use the specified kernel
            const kernel = kernels[kernelName];
            if (typeof kernel === "object" && "command" in kernel) {
                this.launchKernelWithName(kernelName, kernel, testInTerminal);
            } else {
                vscode.window.showErrorMessage(
                    typeof kernel !== "object" ?
                        `Failed to find the kernel ${kernelName} in configurations.` :
                        `Kernel ${kernelName} must contain a \"command\" field.`,
                    "Edit configurations", "Dismiss"
                ).then(value => {
                    if (value === "Edit configurations") {
                        this.config.revealKernelConfigs();
                    }
                });
            }
        }
    };

    private kernelConnected() {
        return Boolean(this.kernel) && Boolean(this.socket);
    }

    private async addNewKernel() {
        const previousKernels = this.config.get("kernel.configurations") as any;

        const name = await vscode.window.showInputBox({
            prompt: "Enter the name of a new kernel, or an existing kernel to edit it"
        });
        if (!name) {
            return;
        }

        const exists = name in previousKernels && typeof previousKernels[name] === "object";
        const previously = exists ? previousKernels[name] : {};

        const kernelLocationPrompt = this.isInWorkspace ?
            ["On this remote system", "On a different machine (via SSH)"] :
            ["On this machine", "On a remote machine (via SSH)"];
        let type = await vscode.window.showQuickPick(kernelLocationPrompt, {
            placeHolder: `Where will this kernel be launched? ${exists ?
                `(was: ${kernelLocationPrompt[previously?.type === "remote" ? 1 : 0]})` : ""
                }`
        });
        if (!type) {
            return;
        } else {
            type = (type === kernelLocationPrompt[0]) ? "local" : "remote";
        }

        let sshHost: any;
        let sshCredentialType: any;
        let sshCredential: any;
        if (type === "remote") {
            sshHost = await vscode.window.showInputBox({
                value: exists ? previously?.sshHost : undefined,
                placeHolder: "user@hostname",
                prompt: "Enter the username and the address of the remote machine."
            });
            if (!sshHost) {
                return;
            }

            sshCredentialType = await vscode.window.showQuickPick(["Private key file", "Skip"], {
                placeHolder: `Select SSH authentication method ${exists ? `(was ${previously?.sshCredentialType === "key" ? "a private key file" : "skipped"})` : ""
                    }`
            });
            if (!sshCredentialType) {
                return;
            } else {
                sshCredentialType = (sshCredentialType === "Private key file") ? "key" : "none";
            }
            sshCredential = "";
            if (sshCredentialType === "key") {
                const keyFile = await vscode.window.showOpenDialog({
                    defaultUri: previously?.sshCredential ? vscode.Uri.file(previously.sshCredential) : undefined
                });
                if (keyFile === undefined || keyFile.length !== 1) {
                    sshCredentialType = "none";
                } else {
                    sshCredential = keyFile[0].fsPath;
                }
            }
        }

        let command = await vscode.window.showInputBox({
            value: exists ? previously?.command : undefined,
            placeHolder: "Default: wolframscript",
            prompt: "Enter the command to launch the kernel."
        });
        if (command === undefined) {
            return;
        } else if (command === "") {
            command = "wolframscript";
        }

        let ports = await vscode.window.showInputBox({
            value: exists ? previously?.ports : undefined,
            placeHolder: "Default: 49152-65535",
            prompt: type === "remote" ?
                "Enter port ranges for communication to the kernel on this machine and the remote machine" :
                "Enter port ranges for communication to the kernel on this machine"
        });
        if (ports === undefined) {
            return;
        } else if (ports === "") {
            ports = "49152-65535";
        }

        const newKernel: any = (type === "remote") ?
            { [name]: { type, command, ports, sshCommand: "ssh", sshHost, sshCredentialType, sshCredential } } :
            { [name]: { type, command, ports } };

        const prevKernelConfigJSON = JSON.stringify(this.config.get("kernel.configurations"));
        const newKernelConfig = { ...JSON.parse(prevKernelConfigJSON), ...newKernel };
        const update = await this.config.update("kernel.configurations", newKernelConfig, vscode.ConfigurationTarget.Global);

        vscode.window.showInformationMessage("A new kernel has been added.", "Start this kernel", "Dismiss").then(value => {
            if (value === "Start this kernel") {
                this.launchKernel(name);
            }
        });
    };

    manageKernel() {
        if (this.kernelConnected()) {
            vscode.window.showQuickPick([
                { label: "$(debug-stop) Quit", detail: "Quit the current kernel." },
                { label: "$(debug-restart) Restart", detail: "Quit the current kernel and start a new one." },
                { label: "$(notebook-edit) Edit kernel configurations in settings", detail: "" }
            ]).then(value => {
                if (value?.label === "$(debug-stop) Quit") {
                    this.quitKernel();
                } else if (value?.label === "$(debug-restart) Restart") {
                    this.quitKernel();
                    this.restartAfterExitKernel = true;
                } else if (value?.label === "$(notebook-edit) Edit kernel configurations in settings") {
                    this.config.revealKernelConfigs();
                }
            });
        } else {
            this.launchKernel();
        }
    }

    private onDidChangeSelectedNotebooks({ notebook, selected }: { notebook: vscode.NotebookDocument, selected: boolean }) {
        if (selected) {
            this.selectedNotebooks.add(notebook);
            WLNotebookOutputPanel.print(`The controller is selected for a notebook ${notebook.uri.fsPath}`);
            if (this.selectedNotebooks.size === 1 && !this.kernelConnected()) {
                // when the controller is selected for the first time
                const defaultKernel = this.config.get("kernel.connectOnOpeningNotebook");
                if (defaultKernel) {
                    this.launchKernel(defaultKernel as string);
                }
            }
        } else {
            this.selectedNotebooks.delete(notebook);
            WLNotebookOutputPanel.print(`The controller is unselected for a notebook ${notebook.uri.fsPath}`);
        }
        WLNotebookOutputPanel.print(`There are ${this.selectedNotebooks.size} notebook(s) for which the controller is selected.`);
        if (this.selectedNotebooks.size === 0 && this.config.get("kernel.quitAutomatically")) {
            // when the last notebook was closed, and the user choose to quit kernel automatically
            this.quitKernel();
        }
    }

    private execute(
        cells: vscode.NotebookCell[],
        _notebook: vscode.NotebookDocument,
        _controller: vscode.NotebookController
    ): void {
        for (let cell of cells) {
            const execution = this.controller.createNotebookCellExecution(cell);
            const id = this.executionQueue.push(execution);
            const self = this;
            execution.token.onCancellationRequested(() => {
                self.abortEvaluation(id);
            });
        }
        this.checkoutExecutionQueue();
    }

    private abortEvaluation(id: string) {
        if (!this.executionQueue.empty()) {
            const execution = this.executionQueue.find(id);
            if (execution) {
                if (execution?.started) {
                    this.kernelConnection.postMessage({
                        type: "abort-evaluations"
                    });
                }
                // remove it from the execution queue
                this.executionQueue.end(id, false);
            }
        }
        this.checkoutExecutionQueue();
    }

    checkoutExecutionQueue() {
        const execution = this.executionQueue.getNextPendingExecution();
        if (execution) {
            if (this.kernelConnected()) {
                // the kernel is ready
                const text = execution.execution.cell.document.getText().replace(/\r\n/g, "\n");
                if (text) {
                    this.kernelConnection.postMessage({
                        type: "evaluate-cell",
                        uuid: execution.id,
                        text: text
                    });
                    this.executionQueue.start(execution.id);
                } else {
                    this.executionQueue.start(execution.id);
                    this.executionQueue.end(execution.id, false);
                }
            } else if (this.connectingtoKernel) {
                // trying to connect to kernel, then do nothing
            } else {
                this.launchKernel();
            }
        }
    }

    async exportNotebook(uri: vscode.Uri) {
        let notebook: vscode.NotebookDocument | undefined;
        this.selectedNotebooks.forEach(current => {
            if (current.uri.toString() === uri.toString()) {
                notebook = current;
            }
        });
        if (!notebook) {
            return;
        }

        const choice = await vscode.window.showQuickPick([
            {
                label: "Wolfram Language Package/Script",
                detail: "Export code cells only"
            }, {
                label: "Wolfram Notebook",
                detail: "Export all cells"
            }, {
                label: "PDF",
                detail: "Export all cells"
            }
        ], {
            placeHolder: "Export As..."
        });
        if (!(choice?.label)) {
            return;
        }
        if ((choice.label === "Wolfram Notebook" || choice.label === "PDF") && !this.kernelConnected()) {
            const start = await vscode.window.showErrorMessage(
                "Exporting as Wolfram Notebook/PDF requires a connected Wolfram Kernel",
                "Connect", "Dismiss"
            );
            if (start === "Connect") {
                this.launchKernel();
            }
            return;
        }

        const cellData: {
            type: string; // Title, Section, Text, Input, ...
            label: string; // In[...]:= , Out[...]=
            text: string | any[];
            isBoxData?: boolean;
        }[] = [];
        const decoder = new util.TextDecoder();
        notebook.getCells().forEach(cell => {
            if (cell.kind === vscode.NotebookCellKind.Markup) {
                cellData.push(...deserializeMarkup(cell.document.getText().replace(/\r\n/g, "\n")));
            } else if (cell.kind === vscode.NotebookCellKind.Code) {
                const executionOrder = cell.executionSummary?.executionOrder;
                cellData.push({
                    type: "Input",
                    label: executionOrder ? `In[${executionOrder}]:=` : "",
                    text: cell.document.getText().replace(/\r\n/g, "\n")
                });
                cell.outputs.forEach(output => {
                    const item = output.items.find(item => item.mime === "text/plain");
                    cellData.push({
                        type: "Output",
                        label: (output?.metadata?.cellLabel || "").toString(),
                        text: decoder.decode(item?.data || new Uint8Array([])),
                        isBoxData: output?.metadata?.isBoxData || false
                    });
                });
            }
        });

        if (choice.label === "Wolfram Language Package/Script") {
            const serializedCells = cellData.filter(data => data.type === "Input").map(data => data.text + "\n");
            let documentText = "(* ::Package:: *)\n\n" + serializedCells.join("\n\n");
            const path = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file((notebook.uri.fsPath || "").replace(/\.[^/.]+$/, ".wl")),
                filters: {
                    "Wolfram Language Package": ["wl"],
                    "Wolfram Language Script": ["wls"],
                    "All Files": ["*"]
                }
            });
            if (path) {
                if (path.fsPath.match(/\.wls$/)) {
                    documentText = "#!/usr/bin/env wolframscript\n" + documentText;
                }
                fileHandler.writeAsync(path.fsPath, documentText);
            }
        } else if (choice.label === "Wolfram Notebook" || choice.label === "PDF") {
            this.statusBarExportItem.show();
            this.kernelConnection.postMessage({
                type: "request-export-notebook",
                format: choice.label === "Wolfram Notebook" ? "nb" : "pdf",
                path: notebook.uri.fsPath,
                cells: cellData
            });
        }
    }

    evaluateFrontEnd(text: string, asynchronous: boolean = false) {
        if (this.kernelConnected()) {
            this.kernelConnection.postMessage({
                type: "evaluate-front-end",
                async: asynchronous,
                text: text
            });
        }
    }
}

interface MessageHandler {
    controller: WLNotebookController;
    handleMessage(message: KernelMessage): void | Promise<void>;
}

class NoOperationMessageHandler implements MessageHandler {
    controller: WLNotebookController;
    constructor(controller: WLNotebookController) {
        this.controller = controller;
    }
    handleMessage(message: KernelMessage) { }
}

class ShowInputNameMessageHandler implements MessageHandler {
    controller: WLNotebookController;
    constructor(controller: WLNotebookController) {
        this.controller = controller;
    }
    handleMessage(message: KernelMessage) {
        const execution = this.controller.executionQueue.find(message.id);
        if (!execution) {
            return;
        }
        const match = message.name.match(/In\[(\d+)\]/);
        if (match) {
            execution.execution.executionOrder = parseInt(match[1]);
        }
    }
}

class ShowOutputMessageHandler implements MessageHandler {
    controller: WLNotebookController;
    constructor(controller: WLNotebookController) {
        this.controller = controller;
    }
    handleMessage(message: KernelMessage) {
        const execution = this.controller.executionQueue.find(message.id);
        if (!execution) {
            return;
        }
        const cellLabel = String(message.name || "");
        const renderMathJax = typeof message.text === "string" &&
            Boolean(cellLabel.match("^Out\\[.+\\]//TeXForm=.*")) &&
            this.controller.config.get("rendering.renderTexForm") === true;
        const outputItems: vscode.NotebookCellOutputItem[] = [];
        if (renderMathJax) {
            outputItems.push(vscode.NotebookCellOutputItem.text(
                tex2svg(JSON.parse(message.text as string), { display: true }),
                "text/html"));
        }
        if (typeof message.html === "string" && !renderMathJax) {
            outputItems.push(vscode.NotebookCellOutputItem.text(message.html, "x-application/wolfram-language-html"));
        }
        if (typeof message.text === "string" && this.controller.config.get("frontEnd.storeOutputExpressions")) {
            outputItems.push(vscode.NotebookCellOutputItem.text(message.text, "text/plain"));
        }
        const output = new vscode.NotebookCellOutput(outputItems);
        output.metadata = { cellLabel, isBoxData: message.isBoxData || false };
        if (execution?.hasOutput) {
            execution.execution.appendOutput(output);
        } else {
            execution.execution.replaceOutput(output);
            execution.hasOutput = true;
        }
    }
}

class EvaluationDoneMessageHandler implements MessageHandler {
    controller: WLNotebookController;
    constructor(controller: WLNotebookController) {
        this.controller = controller;
    }
    handleMessage(message: KernelMessage) {
        const execution = this.controller.executionQueue.find(message.id);
        if (execution && !execution.hasOutput) {
            execution.execution.replaceOutput([]);
        }
        this.controller.executionQueue.end(id, true);
        this.controller.checkoutExecutionQueue();
    }
}

class RequestInputMessageHandler implements MessageHandler {
    controller: WLNotebookController;
    constructor(controller: WLNotebookController) {
        this.controller = controller;
    }
    async handleMessage(message: KernelMessage) {
        let prompt = message.prompt as string;
        let choices: any = null;
        if (prompt === "? ") {
            prompt = "";
        } else if (message.type === "request-input-string") {
            const match = prompt.match(/^(.*) \(((?:.+, )*)(.+)((?:, .+)*)\) \[\3\]: $/);
            if (match) {
                prompt = match[1];
                choices = [
                    ...match[2].split(", ").slice(0, -1),
                    match[3],
                    ...match[4].split(", ").slice(1)
                ].filter(c => (c.length > 0));
            }
        }
        if (choices) {
            const input = await vscode.window.showQuickPick(choices, {
                title: "The kernel requested a choice",
                placeHolder: prompt,
                ignoreFocusOut: true
            });
            this.controller.kernelConnection.postMessage({
                type: "reply-input-string",
                text: input || ""
            });
        } else {
            const input = await vscode.window.showInputBox({
                title: "The kernel requested an input",
                placeHolder: prompt,
                ignoreFocusOut: true
            });
            this.controller.kernelConnection.postMessage({
                type: (message.type === "request-input" ? "reply-input" : "reply-input-string"),
                text: input || ""
            });
        }
    }
}

class ReplyExportNotebookMessageHandler implements MessageHandler {
    controller: WLNotebookController;
    constructor(controller: WLNotebookController) {
        this.controller = controller;
    }
    async handleMessage(message: KernelMessage) {
        this.controller.statusBarExportItem.hide();
        if ((message.text || "") === "") {
            // when there is nothing to export, maybe due to pdf export failure
            vscode.window.showErrorMessage("Failed to export the notebook.");
            return;
        }
        const defaultFormat = message.format === "pdf" ? "pdf" : "nb";
        const defaultDescription = message.format === "pdf" ? "PDF" : "Wolfram Notebook";
        const exportData = message.format === "pdf" ? Buffer.from(message.text, "base64") : message.text as string;
        const path = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file((message?.path || "").replace(/\.[^/.]+$/, "." + defaultFormat)),
            filters: {
                [defaultDescription]: [defaultFormat],
                "All Files": ["*"]
            }
        });
        if (path) {
            fileHandler.writeAsync(path.fsPath, exportData);
        }
    }
}

