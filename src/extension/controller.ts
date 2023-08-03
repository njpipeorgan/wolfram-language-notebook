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
import util = require("util");
import path = require("path");
import zmq = require("zeromq");
import * as child_process from "child_process";
import { readFileSync, writeFile } from "fs";
import { deserializeMarkup } from "./markdown-serializer";
import { tex2svg } from "./load-mathjax";
import { ExecutionQueue } from "./notebook-kernel";
import { KernelStatusBarItem, ExportNotebookStatusBarItem, NotebookOutputPanel } from "./ui-items";
import { NotebookConfig } from "./notebook-config";
import * as uuid from "uuid";


export class WLNotebookController {
  readonly id = "wolfram-language-notebook-controller";
  readonly notebookType = "wolfram-language-notebook";
  readonly label = 'Wolfram Language';
  readonly supportedLanguages = [ "wolfram" ];

  private thisExtension: vscode.Extension<any> | undefined;
  private isInWorkspace: boolean | undefined;
  private settingsCommandName: string = "workbench.action.openSettingsJson";
  private readonly controller: vscode.NotebookController;
  private selectedNotebooks: Set<vscode.NotebookDocument> = new Set();
  private statusBarKernelItem = new KernelStatusBarItem(this.supportedLanguages);
  private statusBarExportItem = new ExportNotebookStatusBarItem();
  private outputPanel = new NotebookOutputPanel("Wolfram Language Notebook");
  private config = new NotebookConfig();
  private extensionPath: string = "";
  private disposables: any[] = [];

  private kernel: any;
  private socket: zmq.Pair | undefined;
  private restartAfterExitKernel = false;
  private connectingtoKernel = false;

  private executionQueue = new ExecutionQueue();
  private formatReceiveQueue: string[] = [];

  constructor() {
    this.thisExtension = vscode.extensions.getExtension("njpipeorgan.wolfram-language-notebook");
    this.isInWorkspace = this.thisExtension?.extensionKind === vscode.ExtensionKind.Workspace;
    if (this.isInWorkspace) {
      this.settingsCommandName = "workbench.action.openRemoteSettingsFile";
    }
    this.extensionPath = this.thisExtension?.extensionPath || "";
    if (!this.extensionPath) {
      throw Error();
    }
    this.outputPanel.print(
      `WLNotebookController(), this.isInWorkspace = ${this.isInWorkspace}, this.extensionPath = ${this.extensionPath}`);

    this.controller = vscode.notebooks.createNotebookController(this.id, this.notebookType, this.label);
    this.controller.supportedLanguages = this.supportedLanguages;
    this.controller.supportsExecutionOrder = true;
    this.controller.executeHandler = this.execute.bind(this);

    this.controller.onDidChangeSelectedNotebooks(({ notebook, selected }) => {
      if (selected) {
        this.selectedNotebooks.add(notebook);
        this.outputPanel.print(`The controller is selected for a notebook ${notebook.uri.fsPath}`);
        if (this.selectedNotebooks.size === 1 && !this.kernelConnected()) {
          // when the controller is selected for the first time
          const defaultKernel = this.config.get("kernel.connectOnOpeningNotebook");
          if (defaultKernel) {
            this.launchKernel(this.config.get("kernel.connectOnOpeningNotebook") as string);
          }
        }
      } else {
        this.selectedNotebooks.delete(notebook);
        this.outputPanel.print(`The controller is unselected for a notebook ${notebook.uri.fsPath}`);
      }
      this.outputPanel.print(`There are ${this.selectedNotebooks.size} notebook(s) for which the controller is selected.`);
      if (this.selectedNotebooks.size === 0 && this.config.get("kernel.quitAutomatically")) {
        // when the last notebook was closed, and the user choose to quit kernel automatically
        this.quitKernel();
      }
    });

    // when notebook config changes, send a message to the kernel
    this.config.onDidChange((config: NotebookConfig) => {
      this.postMessageToKernel({type: "set-config", config: config.getKernelRelatedConfigs()});
    });

    this.disposables.push(this.statusBarKernelItem, this.statusBarExportItem, this.outputPanel, this.config);
    
    this.controller.dispose = () => {
      this.quitKernel();
      this.outputPanel.print(`Notebook controller is disposed; there are ${this.disposables.length} disposables.`);
      this.disposables.forEach(item => {
        item.dispose();
      });
    };
  }

  getController() {
    return this.controller;
  }
  async formatCode(s: string) {
    this.formatFrontEnd(s);
    await new Promise((r) => setTimeout(r, 2000));
    const res = this.formatReceiveQueue.pop() ?? "error";
    return res;
  }
  private getRandomPort(portRanges: string) {
    let ranges = [...portRanges.matchAll(/\s*(\d+)\s*(?:[-‐‑‒–]\s*(\d+)\s*)?/g)]
      .map(match => [parseInt(match[1]), parseInt(match[match[2] === undefined ? 1 : 2])])
      .map(pair => [Math.max(Math.min(pair[0], pair[1]), 1), Math.min(Math.max(pair[0], pair[1]) + 1, 65536)])
      .filter(pair => pair[0] < pair[1]);
    if (ranges.length === 0) {
      ranges = [[49152, 65536]];
    }
    let cmf: number[] = [];
    ranges.reduce((acc, pair, i) => {
      cmf[i] = acc + (pair[1] - pair[0]);
      return cmf[i];
    }, 0);

    const rand = Math.random() * cmf[cmf.length - 1];
    for (let i = 0; i < cmf.length; ++i) {
      if (rand <= cmf[i]) {
        const [lower, upper] = ranges[i];
        return Math.min(Math.floor(Math.random() * (upper - lower)) + lower, upper - 1);
      }
    }
  }

  private postMessageToKernel(message: any) {
    if (this.socket !== undefined) {
      this.socket.send(typeof message === 'string' ? message : JSON.stringify(message));
    } else {
      this.outputPanel.print("The socket is not available; cannot post the message.");
    }
  }

  private writeFileChecked(path: string, text: string | Uint8Array) {
    writeFile(path, text, err => {
      if (err) {
        vscode.window.showErrorMessage(`Unable to write file ${path} \n${err.message}`,
          "Retry", "Save As...", "Dismiss").then(value => {
            if (value === "Retry") {
              this.writeFileChecked(path, text);
            } else if (value === "Save As...") {
              vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(path),
                filters: {
                  "All Files": ["*"]
                }
              }).then(value => {
                if (value) {
                  this.writeFileChecked(value.fsPath, text);
                }
              });
            }
          });
        return;
      }
    });
  
  }

  private async handleMessageFromKernel() {
    while (true) {
      //@ts-ignore
      let [message] = await this.socket?.receive().catch(() => {
        if (this.kernelConnected()) {
          this.outputPanel.print("Failed to receive messages from the kernel, but the kernel is connected.");
        }
        return [new Error("receive-message")];
      });
      if (message instanceof Error) {
        return;
      }
      message = Buffer.from(message).toString("utf-8");
      try {
        message = JSON.parse(message);
      } catch (_) {
        this.outputPanel.print("Failed to parse the following message:");
        this.outputPanel.print(message);
        continue;
      }

      const id = message?.uuid || "";
      const execution = this.executionQueue.find(id);
      switch (message.type) {
        case "show-input-name": {
          if (execution) {
            const match = message.name.match(/In\[(\d+)\]/);
            if (match) {
              execution.execution.executionOrder = parseInt(match[1]);
            }
          }
          break;
        }
        case "format": {
            this.formatReceiveQueue.push(message.text);
        }
        case "show-output":
        case "show-message":
        case "show-text": {
          if (execution) {
            const cellLabel = String(message.name || "");
            const renderMathJax = typeof message.text === "string" &&
              Boolean(cellLabel.match("^Out\\[.+\\]//TeXForm=.*")) && 
              this.config.get("rendering.renderTexForm") === true;
            const outputItems: vscode.NotebookCellOutputItem[] = [];
            if (renderMathJax) {
              outputItems.push(vscode.NotebookCellOutputItem.text(
                tex2svg(JSON.parse(message.text as string), {display: true}),
                "text/html"));
            }
            if (typeof message.html === "string" && !renderMathJax) {
              outputItems.push(vscode.NotebookCellOutputItem.text(message.html, "x-application/wolfram-language-html"));
            }
            if (typeof message.text === "string" && this.config.get("frontEnd.storeOutputExpressions")) {
              outputItems.push(vscode.NotebookCellOutputItem.text(message.text, "text/plain"));
            }
            const output = new vscode.NotebookCellOutput(outputItems);
            output.metadata = { cellLabel, isBoxData: message.isBoxData ?? false };
            if (execution?.hasOutput) {
              execution.execution.appendOutput(output);
            } else {
              execution.execution.replaceOutput(output);
              execution.hasOutput = true;
            }
          }
          break;
        }
        case "evaluation-done": {
          if (execution && !execution.hasOutput) {
            execution.execution.replaceOutput([]);
          }
          this.executionQueue.end(id, true);
          this.checkoutExecutionQueue();
          break;
        }
        case "request-input":
        case "request-input-string": {
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
            this.postMessageToKernel({
              type: "reply-input-string",
              text: input || ""
            });
          } else {
            const input = await vscode.window.showInputBox({
              title: "The kernel requested an input",
              placeHolder: prompt,
              ignoreFocusOut: true
            });
            this.postMessageToKernel({
              type: (message.type === "request-input" ? "reply-input" : "reply-input-string"),
              text: input || ""
            });
          }
          break;
        }
        case "reply-export-notebook": {
          this.statusBarExportItem.hide();
          if ((message.text || "") === "") {
            // when there is nothing to export, maybe due to pdf export failure
            vscode.window.showErrorMessage("Failed to export the notebook.");
            break;
          }
          const defaultFormat = message.format === "pdf" ? "pdf" : "nb";
          const defaultDescription = message.format === "pdf" ? "PDF" : "Wolfram Notebook";
          const exportData = message.format === "pdf" ? Buffer.from(message.text, "base64") : message.text as string;
          const path = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file((message?.path || "").replace(/\.[^/.]+$/, `.${defaultFormat}`)),
            filters: {
              [defaultDescription]: [defaultFormat],
              "All Files": ["*"]
            }
          });
          if (path) {
            this.writeFileChecked(path.fsPath, exportData);
          }
          break;
        }
        case "update-symbol-usages":
          break;
        case "update-symbol-usages-progress":
          break;
        default:
          this.outputPanel.print("The following message has an unexpect type:");
          this.outputPanel.print(JSON.stringify(message));
      }
    }
  }

  private quitKernel() {
    if (this.kernel) {
      // clear executionQueue only when the kernel was connected
      this.executionQueue.clear();
      if (this.kernel.pid) {
        this.outputPanel.print(`Killing kernel process, pid = ${this.kernel.pid}`);
      }
      this.kernel.kill("SIGKILL");
      this.kernel = undefined;
      this.connectingtoKernel = false;
    }
    if (this.socket !== undefined) {
      this.outputPanel.print("Closing socket");
      this.socket.close();
      this.socket = undefined;
    }
    this.statusBarKernelItem.setDisconnected();
  };

  private showKernelLaunchFailed(kernelName: string = "") {
    this.outputPanel.show();
    vscode.window.showErrorMessage(
      `Failed to connect to the kernel${kernelName ? ` \"${kernelName}\"` : ""}.`,
      "Try Again", "Test in Terminal", "Edit configurations"
    ).then(value => {
      if (value === "Try Again") {
        this.launchKernel(kernelName || undefined);
      } else if (value === "Test in Terminal") {
        this.launchKernel(kernelName || undefined, true);
      } else if (value === "Edit configurations") {
        vscode.commands.executeCommand(
          this.settingsCommandName,
          "wolframLanguageNotebook.kernel.configurations"
        );
      }
    });
  }

  private launchKernelWithName(kernelName: string, kernel: any, testInTerminal: boolean = false) {
    this.outputPanel.clear();
    let connectionTimeout = this.config.get("kernel.connectionTimeout") as number;
    if (!(1000 < connectionTimeout)) {
     connectionTimeout = 1000; // milliseconds
    }
    const kernelIsRemote = (kernel?.type === "remote");
    const kernelCommand = String(kernel?.command || "");
    const sshCommand = String(kernel?.sshCommand || "ssh");
    const sshHost = String(kernel?.sshHost || "");
    const sshCredentialType = String(kernel?.sshCredentialType);
    const sshCredential = String(kernel?.sshCredential || "none");
    const kernelPort = this.getRandomPort(String(kernel?.ports));

    this.outputPanel.print(`kernelIsRemote = ${kernelIsRemote}, kernelPort = ${kernelPort}`);

    const kernelInitPath = path.join(this.extensionPath, 'resources', 'init-compressed.txt');
    const kernelRenderInitPath = path.join(this.extensionPath, 'resources', 'render-html.wl');
    this.outputPanel.print(`kernelInitPath = ${kernelInitPath}`);
    this.outputPanel.print(`kernelRenderInitPath = ${kernelRenderInitPath}`);
    let kernelInitString = "";
    let kernelRenderInitString = "";

    try {
      kernelInitString = readFileSync(kernelInitPath).toString();
      kernelRenderInitString = readFileSync(kernelRenderInitPath).toString();
    } catch (_) {
      vscode.window.showErrorMessage("Failed to read kernel initialization files.");
      this.quitKernel();
      return;
    }

    const kernelInitCommands = kernelIsRemote ?
      `"zmqPort=${kernelPort};ToExpression[Uncompress[\\"${kernelInitString}\\"]]"` :
      `ToExpression["zmqPort=${kernelPort};"<>Uncompress["${kernelInitString}"]]`;

    if (this.kernel || this.socket) {
      this.quitKernel();
    }
    let launchCommand = "";
    let launchArguments = [""];
    if (kernelIsRemote) {
      launchCommand = sshCommand || "ssh";
      launchArguments = [
        "-tt",
        ...(sshCredentialType === "key" ? ["-i", sshCredential] : []),
        "-o", "ExitOnForwardFailure=yes",
        "-L", `127.0.0.1:${kernelPort}:127.0.0.1:${kernelPort}`,
        sshHost,
        kernelCommand || "wolframscript",
        ...(testInTerminal ? [] : ["-code", kernelInitCommands])
      ];
    } else {
      launchCommand = kernelCommand || "wolframscript";
      launchArguments = [
        ...(testInTerminal ? [] : ["-code", kernelInitCommands])
      ];
    }

    this.outputPanel.print(`launchCommand = ${String(launchCommand).slice(0, 200)}`);
    this.outputPanel.print(`launchArguments = ${String(launchArguments).slice(0, 200)}`);

    if (testInTerminal) {
      const terminal = vscode.window.createTerminal("Wolfram Language");
      this.disposables.push(terminal);
      terminal.show();
      terminal.sendText(`${launchCommand} ${launchArguments.join(" ")}`);
    } else {
      this.connectingtoKernel = true;
      this.statusBarKernelItem.setConnecting();

      this.kernel = child_process.spawn(launchCommand, launchArguments, { stdio: "pipe" });

      let isFirstMessage = true;
      this.kernel.stdout.on("data", async (data: Buffer) => {
        const message = data.toString();
        if (message.startsWith("<ERROR> ")) {
          // a fatal error
          vscode.window.showErrorMessage(`The kernel has stopped due to the following error: ${message.slice(8)}`);
          return;
        }
        if (true) {
          this.outputPanel.print("Received the following data from kernel:");
          this.outputPanel.print(`${data.toString()}`);
        }
        if (isFirstMessage) {
          if (message.startsWith("<INITIALIZATION STARTS>") || ("<INITIALIZATION STARTS>").startsWith(message)) {
            isFirstMessage = false;
          } else {
            this.outputPanel.print("The first message is expected to be <INITIALIZATION STARTS>, instead of the message above.");
            if (message.startsWith("Mathematica ") || message.startsWith("Wolfram ")) {
              this.outputPanel.print("  It seems that a WolframKernel is launched, but wolframscript is required");
            }
            this.quitKernel();
            this.showKernelLaunchFailed(kernelName);
            return;
          }
        }
        const match = message.match(/\[address tcp:\/\/(127.0.0.1:[0-9]+)\]/);
        if (match) {
          this.socket = new zmq.Pair({ linger: 0 });
          this.socket.connect(`tcp://${match[1]}`);
          const rand = Math.floor(Math.random() * 1e9).toString();
          try {
            this.postMessageToKernel({ type: "test", text: rand });
            let timer: any;
            //@ts-ignore
            const [received] = await Promise.race([
              this.socket.receive(),
              new Promise(res => timer = setTimeout(() => res([new Error("timeout")]), connectionTimeout))
            ]).finally(() => clearTimeout(timer));
            if (received instanceof Error) {
              throw received;
            }
            this.outputPanel.print("Received the following test message from kernel:");
            this.outputPanel.print(`${received.toString()}`);
            const message = JSON.parse(received.toString());
            if (message["type"] !== "test" || message["text"] !== rand) {
              throw new Error("test");
            }
            this.evaluateFrontEnd(kernelRenderInitString, false);
            this.postMessageToKernel({type: "set-config", config: this.config.getKernelRelatedConfigs()});
            this.connectingtoKernel = false;
            this.statusBarKernelItem.setConnected(message["version"] || "", kernelIsRemote);
            try {
              this.handleMessageFromKernel();
            } catch {}
            this.checkoutExecutionQueue();
          } catch (error) {
            if (error instanceof Error) {
              if (error.message === "timeout") {
                this.outputPanel.print("The kernel took too long to respond through the ZeroMQ link.");
              } else if (error.message === "test") {
                this.outputPanel.print("The kernel responded with a wrong test message, as above");
                this.outputPanel.print(`  The expected message should contain: ${JSON.stringify({type: "test", text: rand})}`);
              }
            }
            this.quitKernel();
            this.showKernelLaunchFailed(kernelName);
          }
        }
      });
      this.kernel.stderr.on("data", (data: Buffer) => {
        this.outputPanel.print("Received the following data from kernel (stderr):");
        this.outputPanel.print(`${data.toString()}`);
      });
      this.kernel.on("exit", (code: number, signal: string) => {
        this.quitKernel();
        this.outputPanel.print(`Process exited with code ${code} and signal ${signal}.`);
        if (this.restartAfterExitKernel) {
          this.restartAfterExitKernel = false;
          this.launchKernel();
        } else {
          vscode.window.showWarningMessage(`Kernel "${kernelName}" has been disconnected.`);
        }
      });
      this.kernel.on("error", (err: Error) => {
        this.outputPanel.print(`Error occured in spwaning the kernel process: \n${err}`);
        this.quitKernel();
        this.showKernelLaunchFailed(kernelName);
      });
    }

    
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
      ]).then((value:{label: string, detail: string}) => {
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
            vscode.commands.executeCommand(
              this.settingsCommandName,
              "wolframLanguageNotebook.kernel.configurations"
            );
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
            vscode.commands.executeCommand(
              this.settingsCommandName,
              "wolframLanguageNotebook.kernel.configurations"
            );
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
    if (type) {
      type = (type === kernelLocationPrompt[0]) ? "local" : "remote";
    } else {
      return;
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
      if (sshCredentialType) {
        sshCredentialType = (sshCredentialType === "Private key file") ? "key" : "none";
      } else {
        return;
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
    const newKernelConfig = {...JSON.parse(prevKernelConfigJSON), ...newKernel};
    await this.config.update("kernel.configurations", newKernelConfig, vscode.ConfigurationTarget.Global);

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
          vscode.commands.executeCommand(
            this.settingsCommandName,
            "wolframLanguageNotebook.kernel.configurations"
          );
        }
      });
    } else {
      this.launchKernel();
    }
  };

  private execute(
    cells: vscode.NotebookCell[],
    _notebook: vscode.NotebookDocument,
    _controller: vscode.NotebookController
  ): void {
    cells.forEach(cell => {
      const execution = this.controller.createNotebookCellExecution(cell);
      const id = this.executionQueue.push(execution);
      const self = this;
      execution.token.onCancellationRequested(() => {
        self.abortEvaluation(id);
      });
    })
    this.checkoutExecutionQueue();
  }

  private abortEvaluation(id: string) {
    if (!this.executionQueue.empty()) {
      const execution = this.executionQueue.find(id);
      if (execution) {
        if (execution?.started) {
          this.postMessageToKernel({
            type: "abort-evaluations"
          });
        }
        // remove it from the execution queue
        this.executionQueue.end(id, false);
      }
    }
    this.checkoutExecutionQueue();
  }

  private checkoutExecutionQueue() {
    const execution = this.executionQueue.getNextPendingExecution();
    if (execution) {
      if (this.kernelConnected()) {
        // the kernel is ready
        const text = execution.execution.cell.document.getText().replace(/\r\n/g, "\n");
        if (text) {
          this.postMessageToKernel({
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
            isBoxData: output?.metadata?.isBoxData ?? false
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
        this.writeFileChecked(path.fsPath, documentText);
      }
    } else if (choice.label === "Wolfram Notebook" || choice.label === "PDF") {
      this.statusBarExportItem.show();
      this.postMessageToKernel({
        type: "request-export-notebook",
        format: choice.label === "Wolfram Notebook" ? "nb" : "pdf",
        path: notebook.uri.fsPath,
        cells: cellData
      });
    }
  }

  evaluateFrontEnd(text: string, asynchronous: boolean = false) {
    if (this.kernelConnected()) {
      this.postMessageToKernel({
        type: "evaluate-front-end",
        async: asynchronous,
        text
      });
    }
  }
  formatFrontEnd(text: string, asynchronous: boolean = false) {
    if (this.kernelConnected()) {
      this.postMessageToKernel({
        uuid: uuid.v4(),
        type: "format",
        async: asynchronous,
        text
      });
    }
  }
}
