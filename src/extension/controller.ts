import * as vscode from "vscode";
import stringArgv from "string-argv";
import * as uuid from "uuid";
const util = require("util");
const path = require("path");
const zmq = require("zeromq");
import * as child_process from "child_process";
import { readFileSync } from "fs";
import { deserializeMarkup } from "./serializer";

interface ExecutionItem {
  id: string,
  execution: vscode.NotebookCellExecution,
  started?: boolean,
  hasOutput?: boolean // replace with output if false; append output if true
}

class ExecutionQueue {
  private queue: ExecutionItem[] = [];

  constructor() {
  }

  empty(): boolean {
    return this.queue.length === 0;
  }

  clear(): void {
    this.queue.map(item => {
      this.end(item.id, false);
    });
    this.queue = [];
  }

  push(execution: vscode.NotebookCellExecution): string {
    const id = uuid.v4();
    this.queue.push({ id, execution });
    return id;
  }

  private findIndex(id: string): number {
    return this.queue.findIndex(item => (item.id === id));
  }

  at(index: number): ExecutionItem | null {
    return this.queue[index] || null;
  }

  find(id: string): ExecutionItem | null {
    return this.at(this.findIndex(id));
  }

  remove(id: string): void {
    const index = this.findIndex(id);
    if (index >= 0) {
      this.queue.splice(index, 1);
    }
  }

  start(id: string): void {
    const execution = this.find(id);
    if (execution) {
      execution.execution.start(Date.now());
      execution.started = true;
    }
  }

  end(id: string, succeed: boolean): void {
    const execution = this.find(id);
    if (execution) {
      if (!(execution?.started)) {
        execution.execution.start(Date.now());
      }
      execution.execution.end(succeed, Date.now());
      this.remove(id);
    }
  }

  pendingExecution(): ExecutionItem | null {
    if (this.queue.length > 0 && !(this.queue[0]?.started)) {
      return this.queue[0];
    } else {
      return null;
    }
  }
}

class KernelStatusBarItem {
  private item: vscode.StatusBarItem;
  private readonly baseText = " Wolfram Kernel";

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      "wolfram-language-notebook-kernel-status", vscode.StatusBarAlignment.Right, 100
    );
    this.item.name = "Wolfram Kernel";
    this.item.command = "wolframLanguageNotebook.manageKernels";
    this.setDisconnected();
    this.item.show();
  }

  dispose() {
    this.item.dispose();
  }

  show() {
    this.item.show();
  }

  hide() {
    this.item.hide();
  }

  setDisconnected() {
    this.item.text = "$(close)" + this.baseText;
    this.item.tooltip = "Currently not connected to a kernel";
  }

  setConnecting() {
    this.item.text = "$(loading~spin)" + this.baseText;
    this.item.tooltip = "Connecting to the kernel";
  }

  setConnected(tooltip?: string) {
    this.item.text = "$(check)" + this.baseText;
    this.item.tooltip = tooltip || "Kernel connected";
  }
}

export class WLNotebookController {
  readonly id = "wolfram-language-notebook-controller";
  readonly notebookType = "wolfram-language-notebook";
  readonly label = 'Wolfram Language';
  readonly supportedLanguages = ["wolfram"];

  private readonly controller: vscode.NotebookController;
  private selectedNotebooks: Set<vscode.NotebookDocument> = new Set();
  private notebookRendererMessaging: vscode.NotebookRendererMessaging;
  private statusBarKernelItem = new KernelStatusBarItem();
  private extensionPath: string = "";
  private disposables: any[] = [];

  private kernel: any;
  private socket: any;
  private restartAfterExitKernel = false;
  private connectingtoKernel = false;

  private executionQueue = new ExecutionQueue();

  constructor() {
    this.extensionPath = vscode.extensions.getExtension("njpipeorgan.wolfram-language-notebook")?.extensionPath || "";
    if (!this.extensionPath) {
      throw Error();
    }
    console.log(`WLNotebookController(), this.extensionPath = ${this.extensionPath}`);

    this.controller = vscode.notebooks.createNotebookController(
      this.id, this.notebookType, this.label
    );
    this.notebookRendererMessaging = vscode.notebooks.createRendererMessaging("wolfram-language-notebook-renderer");
    // this.notebookRendererMessaging.onDidReceiveMessage(e => {
    //   switch (e.message.type) {
    //     case "update-html":
    //       const { id, value } = e.message;
    //       this.selectedNotebooks.forEach(notebook => {
    //         notebook.getCells().forEach(cell => {
    //           if (cell.kind === vscode.NotebookCellKind.Code) {
    //             cell.outputs.forEach(output => {
    //             });
    //           }
    //         });
    //       });
    //       break;
    //     default:
    //   }
    // });

    this.controller.supportedLanguages = this.supportedLanguages;
    this.controller.supportsExecutionOrder = true;
    this.controller.executeHandler = this.execute.bind(this);
    this.controller.onDidChangeSelectedNotebooks(({ notebook, selected }) => {
      if (selected) {
        this.selectedNotebooks.add(notebook);
        console.log(`The controller is selected for a notebook ${notebook.uri.fsPath}`);
        if (this.selectedNotebooks.size === 1 && !this.kernelConnected()) {
          // when the controller is selected for the first time
          const defaultKernel = this.getConfig("kernel.connectOnOpeningNotebook");
          if (defaultKernel) {
            this.launchKernel(this.getConfig("kernel.connectOnOpeningNotebook") as string);
          }
        }
      } else {
        this.selectedNotebooks.delete(notebook);
        console.log(`The controller is unselected for a notebook ${notebook.uri.fsPath}`);
      }
      console.log(`There are ${this.selectedNotebooks.size} for which the controller is selected.`);
      if (this.selectedNotebooks.size === 0 && this.getConfig("kernel.quitAutomatically")) {
        // when the last notebook was closed, and the user choose to quit kernel automatically
        this.quitKernel();
      }
    });

    this.disposables.push(this.statusBarKernelItem);
    this.disposables.push(vscode.window.onDidChangeActiveTextEditor(event => {
      if (event?.document && this.supportedLanguages.includes(event.document.languageId)) {
        this.statusBarKernelItem.show();
      } else {
        this.statusBarKernelItem.hide();
      }
    }));
    this.disposables.push(vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration("wolframLanguageNotebook.rendering") ||
        e.affectsConfiguration("wolframLanguageNotebook.frontEnd")
      ) {
        this.postConfigToKernel();
      }
    }));

    this.controller.dispose = () => {
      this.quitKernel();
      console.log("controller.disposed()");
      this.disposables.forEach(item => {
        item.dispose();
      });
    };
  }

  getController() {
    return this.controller;
  }

  private getConfig(key: string) {
    return vscode.workspace.getConfiguration("wolframLanguageNotebook").get(key);
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
        const lower = ranges[i][0];
        const upper = ranges[i][1];
        return Math.min(Math.floor(Math.random() * (upper - lower)) + lower, upper - 1);
      }
    }
  }

  private postMessageToKernel(message: any) {
    if (this.socket !== undefined) {
      this.socket.send(typeof message === 'string' ? message : JSON.stringify(message));
      console.log("message posted " + (typeof message === 'string' ? message : JSON.stringify(message)));
    } else {
      console.log("The socket is not available; cannot post the message.");
    }
  }

  private async handleMessageFromKernel() {
    while (true) {
      let [message] = await this.socket.receive().catch(() => {
        if (this.kernel === undefined && this.socket === undefined) {
          console.log("Failed to receive messages from the kernel because the kernel has been disconnected.");
        } else {
          console.log("Failed to receive messages with:");
          console.log({ kernel: this.kernel, socket: this.socket });
        }
        return [Error("Failed to receive messages.")];
      });
      if (message instanceof Error) {
        console.log(message);
        return;
      }
      console.log(message);
      message = Buffer.from(message).toString("utf-8");
      console.log(message);
      try {
        message = JSON.parse(message);
      } catch (error) {
        console.log("Failed to parse the previous message.");
        continue;
      }

      const id = message?.uuid || "";
      const execution = this.executionQueue.find(id);
      console.log(`handleMessageFromKernel(), uuid = ${id}`);
      switch (message.type) {
        case "show-input-name":
          if (execution) {
            const match = message.name.match(/In\[(\d+)\]/);
            if (match) {
              execution.execution.executionOrder = parseInt(match[1]);
            }
          }
          break;
        case "show-output":
        case "show-message":
        case "show-text":
          if (execution) {
            const outputItems = [
              vscode.NotebookCellOutputItem.text(message.html, "x-application/wolfram-language-html")
            ];
            if (typeof message.text === "string" && this.getConfig("frontEnd.storeOutputExpressions")) {
              outputItems.push(vscode.NotebookCellOutputItem.text(message.text, "text/plain"));
            }
            const output = new vscode.NotebookCellOutput(outputItems);
            output.metadata = {
              cellLabel: message.name
            };
            if (execution?.hasOutput) {
              execution.execution.appendOutput(output);
            } else {
              execution.execution.replaceOutput(output);
              execution.hasOutput = true;
            }
          }
          break;
        case "evaluation-done":
          this.executionQueue.end(id, true);
          this.checkoutExecutionQueue();
          break;
        case "request-input":
        case "request-input-string":
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
              // console.log(`The packet is a ChoiceDialog, the choices are ${choices}.`);
            }
          }
          if (choices) {
            const input = await vscode.window.showQuickPick(choices, { placeHolder: prompt });
            this.postMessageToKernel({
              type: "reply-input-string",
              text: input || ""
            });
          } else {
            const input = await vscode.window.showInputBox({ placeHolder: prompt });
            this.postMessageToKernel({
              type: (message.type === "request-input" ? "reply-input" : "reply-input-string"),
              text: input || ""
            });
          }
          break;
        case "reply-export-notebook":
          // this.writeFileChecked(message.path, message.text);
          break;
        default:
        // console.log("message has an unexpect type", message);
      }
    }
  }

  private postConfigToKernel() {
    const configNames = [
      "frontEnd.storeOutputExpressions",
      "rendering.outputSizeLimit",
      "rendering.boxesTimeLimit",
      "rendering.htmlTimeLimit",
      "rendering.htmlMemoryLimit",
      "rendering.imageWithTransparency"
    ];
    const renderingConfig = vscode.workspace.getConfiguration("wolframLanguageNotebook");
    let config: { [key: string]: any } = {};
    configNames.forEach(name => {
      config[name.split('.').pop() as string] = renderingConfig.get(name);
    });
    this.postMessageToKernel({
      type: "set-config",
      config: config
    });
  };

  private quitKernel() {
    this.executionQueue.clear();
    if (this.kernel) {
      console.log("Killing kernel");
      this.kernel.kill();
      this.kernel = undefined;
      this.connectingtoKernel = false;
    }
    if (this.socket !== undefined) {
      console.log("Closing socket");
      this.socket.close();
      this.socket = undefined;
    }
    this.statusBarKernelItem.setDisconnected();
  };

  private launchKernelWithName(kernelName: string, kernel: any) {
    let connectionTimeout = this.getConfig("kernel.connectionTimeout") as number;
    if (!(1000 < connectionTimeout)) {
      connectionTimeout = 1000; // milliseconds
    }
    const localPortRanges = this.getConfig("kernel.localPorts");
    const kernelIsRemote = (kernel?.type === "remote");
    const kernelCommand = stringArgv(String(kernel?.command || ""));
    const sshCommand = stringArgv(String(kernel?.sshCommand || "ssh"));
    const sshHost = String(kernel?.sshHost || "");
    const sshCredentialType = String(kernel?.sshCredentialType);
    const sshCredential = String(kernel?.sshCredential || "none");
    const kernelPort = kernelIsRemote ? this.getRandomPort(String(kernel?.ports)) : this.getRandomPort(String(localPortRanges));

    console.log(`remote = ${kernelIsRemote}, port = ${kernelPort}`);

    const kernelInitPath = path.join(this.extensionPath, 'resources', 'init-compressed.txt');
    const kernelInitCommands = kernelIsRemote ?
      `"zmqPort=${kernelPort};ToExpression[Uncompress[\\"${readFileSync(kernelInitPath).toString()}\\"]]"` :
      `ToExpression["zmqPort=${kernelPort};"<>Uncompress["${readFileSync(kernelInitPath).toString()}"]]`;

    this.connectingtoKernel = true;
    this.statusBarKernelItem.setConnecting();
    this.statusBarKernelItem.show();
    console.log(this.statusBarKernelItem);
    if (this.kernel || this.socket) {
      this.quitKernel();
    }
    let launchCommand = "";
    let launchArguments = [""];
    if (kernelIsRemote) {
      launchCommand = sshCommand[0] || "ssh";
      launchArguments = [
        ...sshCommand.splice(1),
        "-tt",
        ...(sshCredentialType === "key" ? ["-i", sshCredential] : []),
        "-o", "ExitOnForwardFailure=yes",
        "-L", `127.0.0.1:${kernelPort}:127.0.0.1:${kernelPort}`,
        sshHost,
        kernelCommand[0] || "wolframscript",
        ...kernelCommand.splice(1),
        "-code", kernelInitCommands
      ];
    } else {
      launchCommand = kernelCommand[0] || "wolframscript";
      launchArguments = [
        ...kernelCommand.splice(1),
        "-code", kernelInitCommands
      ];
    }
    console.log("launchCommand = " + launchCommand);
    console.log("launchArguments = ", launchArguments.toString().slice(0, 200));
    this.kernel = child_process.spawn(launchCommand, launchArguments);

    this.kernel.stdout.on("data", async (data: Buffer) => {
      console.log("Received the following data from kernel:");
      console.log(`${data.toString()}`);
      const message = data.toString();
      const match = message.match(/\[address tcp:\/\/(127.0.0.1:[0-9]+)\]/);
      if (match) {
        // console.log(`match = ${match}`);
        this.socket = new zmq.Pair({ linger: 0 });
        this.socket.connect("tcp://" + match[1]);
        const rand = Math.floor(Math.random() * 1e9).toString();
        try {
          this.postMessageToKernel({ type: "test", text: rand });
          let timer: any;
          const [received] = await Promise.race([
            this.socket.receive(),
            new Promise(res => timer = setTimeout(() => res([Error("timeout")]), connectionTimeout))
          ]).finally(() => clearTimeout(timer));
          if (received instanceof Error) {
            throw received;
          }
          // console.log("Received the following test message from kernel:");
          // console.log(`${received.toString()}`);
          const message = JSON.parse(received.toString());
          if (message["type"] !== "test" || message["text"] !== rand) {
            throw Error("wrong message");
          }
          this.postConfigToKernel();
          this.connectingtoKernel = false;
          this.statusBarKernelItem.setConnected(message["version"] || "");
          this.handleMessageFromKernel();
          this.checkoutExecutionQueue();
        } catch (error) {
          // console.log("Catched an error when connecting to the kernel:", error);
          this.quitKernel();
        }
      }
    });
    this.kernel.stderr.on("data", (data: Buffer) => {
      console.log("Received the following data from kernel (stderr):");
      console.log(`${data.toString()}`);
    });
    this.kernel.on("exit", (code: number, signal: string) => {
      this.quitKernel();
      console.log(`Process exited with code ${code} and signal ${signal}.`);
      if (this.restartAfterExitKernel) {
        this.restartAfterExitKernel = false;
        this.launchKernel();
      }
    });
    this.kernel.on("error", () => {
      this.quitKernel();
      vscode.window.showWarningMessage(`Failed to connect to the kernel ${kernelName}.`, "Try Again", "Open settings", "Dismiss").then(value => {
        if (value === "Try Again") {
          this.launchKernel();
        } else if (value === "Open settings") {
          vscode.commands.executeCommand("workbench.action.openSettings", "wolframLanguageNotebook");
        }
      });
    });
  };

  private launchKernel(kernelName: string | undefined = undefined) {
    if (this.kernelConnected()) {
      return;
    }
    this.quitKernel();
    const kernels = this.getConfig("kernel.configurations") as any;
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
                port: "49152-65535"
              }
            };
            config.update("kernel.configurations",
              { ...config.get("kernel.configurations"), ...newKernel },
              vscode.ConfigurationTarget.Global
            ).then(() => {
              this.launchKernel("wolframscript");
            });
          }
          else if (value.label.startsWith("$(debug-start)")) {
            this.launchKernel(value.label.substring(15));
          } else if (value.label === "$(new-file) Add a new kernel") {
            this.addNewKernel();
          } else if ("$(notebook-edit) Edit kernel configurations in settings") {
            vscode.commands.executeCommand(
              "workbench.action.openSettings",
              "wolframLanguageNotebook.kernel.configurations"
            );
          }
        }
      });
    } else {
      // try to use the specified kernel
      const kernel = kernels[kernelName];
      if (typeof kernel === "object" && "command" in kernel) {
        this.launchKernelWithName(kernelName, kernel);
      } else {
        vscode.window.showErrorMessage(
          `Failed to find the kernel ${kernelName} in configurations.\nA kernel must contain a \"command\" field.`,
          "Edit configurations", "Dismiss"
        ).then(value => {
          if (value === "Edit configurations") {
            vscode.commands.executeCommand(
              "workbench.action.openSettings",
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
    const previousKernels = this.getConfig("kernel.configurations") as any;

    const name = await vscode.window.showInputBox({
      prompt: "Enter the name of a new kernel, or an existing kernel to edit it"
    });
    if (!name) {
      return;
    }

    const exists = name in previousKernels && typeof previousKernels[name] === "object";
    const previously = exists ? previousKernels[name] : {};

    let type = await vscode.window.showQuickPick(["On this machine", "On a remote machine"], {
      placeHolder: `Where will this kernel be launched? ${exists ? `(was ${previously?.type === "remote" ? "remote" : "local"})` : ""
        }`
    });
    if (!type) {
      return;
    } else {
      type = (type === "On this machine") ? "local" : "remote";
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

    const config = vscode.workspace.getConfiguration("wolframLanguageNotebook");
    console.log(`config.get("kernel.configurations") = ${config.get("kernel.configurations")}`);
    const update = await config.update("kernel.configurations",
      { ...config.get("kernel.configurations"), ...newKernel },
      vscode.ConfigurationTarget.Global
    );
    console.log(`update = ${update}`);

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
        } else if ("$(notebook-edit) Edit kernel configurations in settings") {
          vscode.commands.executeCommand(
            "workbench.action.openSettings",
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
    for (let cell of cells) {
      const execution = this.controller.createNotebookCellExecution(cell);
      const id = this.executionQueue.push(execution);
      const self = this;
      execution.token.onCancellationRequested(() => {
        console.log("onCancellationRequested()");
        self.abortEvaluation(id);
      });
    }
    this.checkoutExecutionQueue();
  }

  private abortEvaluation(id: string) {
    console.log(`abortEvaluation(), id = ${id}`);
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
    const execution = this.executionQueue.pendingExecution();
    if (execution) {
      if (this.kernelConnected()) {
        // the kernel is ready
        this.postMessageToKernel({
          type: "evaluate-cell",
          uuid: execution.id,
          text: execution.execution.cell.document.getText()
        });
        this.executionQueue.start(execution.id);
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
      console.log(current.uri.toString());
      if (current.uri.toString() === uri.toString()) {
        notebook = current;
      }
    });
    console.log(uri.toString(), notebook);
    if (!notebook) {
      return;
    }

    const choice = await vscode.window.showQuickPick([
      { label: "Wolfram Language Script" },
      { label: "Wolfram Notebook" }
    ], {
      placeHolder: "Export As..."
    });
    if (!(choice?.label)) {
      return;
    }
    const cellData: {
      type: string; // Title, Section, Text, Input, ...
      label: string; // In[...]:= , Out[...]=
      text: string;
    }[] = [];
    const decoder = new util.TextDecoder();
    notebook.getCells().forEach(cell => {
      if (cell.kind === vscode.NotebookCellKind.Markup) {
        cellData.push(...deserializeMarkup(cell.document.getText()));
      } else if (cell.kind === vscode.NotebookCellKind.Code) {
        const executionOrder = cell.executionSummary?.executionOrder;
        cellData.push({
          type: "Input",
          label: executionOrder ? `In[${executionOrder}]:=` : "",
          text: cell.document.getText()
        });
        cell.outputs.forEach(output => {
          const item = output.items.find(item => item.mime === "text/plain");
          cellData.push({
            type: "Output",
            label: (output?.metadata?.cellLabel || "").toString(),
            text: decoder.decode(item?.data || new Uint8Array([]))
          });
        });
      }
    });
    console.log(cellData);
    if (choice?.label === "Wolfram Language Script") {

    } else if (choice?.label === "Wolfram Language Script") {

    }

    
  }
}
