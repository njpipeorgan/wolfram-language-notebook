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
import * as child_process from "child_process";
import { WLNotebookOutputPanel } from "./output-panel";
import { FileHandler } from "./file-handler";
import path = require("path");
let zmq: typeof import("zeromq") | undefined;
try {
    zmq = require("zeromq") as typeof import("zeromq");
} catch (error) {
    vscode.window.showWarningMessage((error as Error).message);
    zmq = undefined;
}

class ZeroMQSocket {
    private socket?: import("zeromq").Pair;
    private connectionAddress?: string;
    private readonly socketAvailabilityCheckInterval = 500; // ms

    constructor(socket?: import("zeromq").Pair) {
        this.socket = socket;
    }

    setSocket(socket: import("zeromq").Pair) {
        this.close();
        this.socket = socket;
    }

    alive() {
        return this.socket && !this.socket.closed;
    }

    close() {
        if (this.alive()) {
            this.socket?.close();
        }
        this.socket = undefined;
    }

    async sendJSON(messageJSON: { [key: string]: any }) {
        if (this.alive()) {
            this.socket?.send(JSON.stringify(messageJSON));
        } else {
            WLNotebookOutputPanel.print("The socket is not available; cannot post the message.");
        }
    }

    async receiveJSON() {
        if (this.socket === undefined) {
            await new Promise(resolve => setTimeout(resolve, this.socketAvailabilityCheckInterval));
            return null;
        }
        let [message] = await this.socket.receive().catch(() => {
            this.close();
            return [new Error("Failed to receive message")];
        });
        if (message instanceof Error) {
            return null;
        }

        let messageString = Buffer.from(message).toString("utf-8");
        let messageJSON: any;
        try {
            messageJSON = JSON.parse(messageString);
        } catch (error) {
            WLNotebookOutputPanel.print("Failed to parse the following message into JSON:");
            WLNotebookOutputPanel.print(messageString);
            return null;
        }
        return messageJSON;
    }

}

class WLKernel {
    private kernel?: child_process.ChildProcess;
    private restartAfterExitKernel = false;
    private connectingtoKernel = false;
    private readonly minimumKernelLaunchTimeout = 1000; // milliseconds
    private readonly fileHandler = new FileHandler();

    private readonly associatedSocket: ZeroMQSocket;

    constructor(associatedSocket: ZeroMQSocket) {
        this.associatedSocket = associatedSocket;
    }

    alive() {
        return this.kernel && !this.kernel.killed;
    }

    terminate() {
        if (this.alive()) {
            WLNotebookOutputPanel.print(`Terminating kernel process, pid = ${this?.kernel?.pid}`);
            this.kernel?.kill("SIGKILL");
        }
        if (this.associatedSocket.alive()) {
            WLNotebookOutputPanel.print("Closing socket");
            this.associatedSocket.close();
        }
        this.kernel = undefined;
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

    async launch(kernelName: string, kernel: { [key: string]: any }, timeout: number, resourceDirectory: string) {
        WLNotebookOutputPanel.clear();
        if (!(this.minimumKernelLaunchTimeout < timeout)) {
            timeout = this.minimumKernelLaunchTimeout;
        }
        const kernelIsRemote = (kernel?.type === "remote");
        const kernelCommand = String(kernel?.command || "");
        const sshCommand = String(kernel?.sshCommand || "ssh");
        const sshHost = String(kernel?.sshHost || "");
        const sshPort = String(kernel?.sshPort || "22");
        const sshCredentialType = String(kernel?.sshCredentialType);
        const sshCredential = String(kernel?.sshCredential || "none");
        const kernelPort = this.getRandomPort(String(kernel?.ports));

        const kernelInitPath = path.join(resourceDirectory, 'init-compressed.txt');
        const kernelRenderInitPath = path.join(resourceDirectory, 'render-html.wl');

        WLNotebookOutputPanel.print(`Launching kernel ${kernelName}...`);
        WLNotebookOutputPanel.print(`    isRemote = ${kernelIsRemote}, port = ${kernelPort}`);
        WLNotebookOutputPanel.print(`    initPath = ${kernelInitPath}, RenderInitPath = ${kernelRenderInitPath}`);

        let kernelInitString = "";
        let kernelRenderInitString = "";

        try {
            kernelInitString = this.fileHandler.readSync(kernelInitPath);
            kernelRenderInitString = this.fileHandler.readSync(kernelRenderInitPath);
        } catch (error) {
            vscode.window.showErrorMessage("Failed to read kernel initialization files.");
            this.terminate();
            return;
        }

        const kernelInitCommands = kernelIsRemote ?
            `"zmqPort=${kernelPort};ToExpression[Uncompress[\\"${kernelInitString}\\"]]"` :
            `ToExpression["zmqPort=${kernelPort};"<>Uncompress["${kernelInitString}"]]`;

        let launchCommand = "";
        let launchArguments = [""];
        if (kernelIsRemote) {
            launchCommand = sshCommand || "ssh";
            launchArguments = [
                "-tt",
                ...(sshCredentialType === "key" ? ["-i", sshCredential] : []),
                "-o", "ExitOnForwardFailure=yes",
                "-L", `127.0.0.1:${kernelPort}:127.0.0.1:${kernelPort}`,
                "-p", sshPort,
                sshHost,
                kernelCommand || "wolframscript",
                "-code", kernelInitCommands
            ];
        } else {
            launchCommand = kernelCommand || "wolframscript";
            launchArguments = [
                "-code", kernelInitCommands
            ];
        }

        WLNotebookOutputPanel.print(`launchCommand = ${String(launchCommand)}`);
        WLNotebookOutputPanel.print(`launchArguments = ${String(launchArguments).slice(0, 200)} ...`);

        this.kernel = child_process.spawn(launchCommand, launchArguments, { stdio: "pipe" });

        const launchPromise = new Promise<string>((resolve, reject) => {
            const connectionTimeout = setTimeout(() => {
                reject(new Error("timeout"));
            }, timeout);

            let isFirstMessage = true;

            this.kernel?.stdout?.on("data", (data: Buffer) => {
                const message = data.toString();
                if (message.startsWith("<ERROR> ")) {
                    // a fatal error
                    vscode.window.showErrorMessage("The kernel has stopped due to the following error: " + message.slice(8));
                    reject(new Error("stopped"));
                }
                WLNotebookOutputPanel.print("Received the following data from kernel:");
                WLNotebookOutputPanel.print(`${data.toString()}`);
                if (isFirstMessage) {
                    if (message.startsWith("<INITIALIZATION STARTS>") || ("<INITIALIZATION STARTS>").startsWith(message)) {
                        isFirstMessage = false;
                    } else {
                        WLNotebookOutputPanel.print("The first message is expected to be <INITIALIZATION STARTS>, instead of the message above.");
                        if (message.startsWith("Mathematica ") || message.startsWith("Wolfram ")) {
                            WLNotebookOutputPanel.print("  It seems that a WolframKernel is launched, but wolframscript is required");
                        }
                        reject(new Error("wrong-message"));
                    }
                }
                const match = message.match(/\[address tcp:\/\/(127.0.0.1:[0-9]+)\]/);
                if (match) {
                    clearTimeout(connectionTimeout);
                    resolve("tcp://" + match[1]);
                }
            });

            this.kernel?.on("error", (err: Error) => {
                WLNotebookOutputPanel.print(`Error occured in spawning the kernel process: \n${err}`);
                reject(new Error("error"));
            });

            this.kernel?.stderr?.on("data", (data: Buffer) => {
                WLNotebookOutputPanel.print("Received the following data from kernel (stderr):");
                WLNotebookOutputPanel.print(`${data.toString()}`);
            });

            this.kernel?.on("exit", (code: number, signal: string) => {
                WLNotebookOutputPanel.print(`Process exited with code ${code} and signal ${signal}.`);
            });
        });

        try {
            return await launchPromise;
        } catch (error) {
            this.terminate();
            return null;
        }
    }
}

export interface KernelMessage {
    type: string,
    [key: string]: any
}

export class WLKernelConnection {
    private socket;
    private kernel;
    private messageHandlers: { [type: string]: (data: any) => void | Promise<void> } = {};

    constructor() {
        this.socket = new ZeroMQSocket();
        this.kernel = new WLKernel(this.socket);
    }

    postMessage(message: KernelMessage) {
        this.socket.sendJSON(message);
    }

    registerMessageHandler(messageType: string | string[], handler: (data: any) => void | Promise<void>) {
        if (typeof messageType === "string") {
            messageType = [messageType];
        }
        for (let type of messageType) {
            this.messageHandlers[type] = handler;
        }
    }

    alive() {
        let alive = this.kernel.alive() && this.socket.alive();
        return alive;
    }

    private async receiveAndHandleMessages() {
        while (true) {
            let messageJSON = await this.socket.receiveJSON();

            if (typeof messageJSON.type !== "string") {
                WLNotebookOutputPanel.print("The following message does not contain the \"type\" field:");
                WLNotebookOutputPanel.print(JSON.stringify(messageJSON));
                continue;
            }

            if (this.messageHandlers[messageJSON.type] === undefined) {
                WLNotebookOutputPanel.print(`No handler for the following message type (${messageJSON.type}): `);
                WLNotebookOutputPanel.print(JSON.stringify(messageJSON));
                continue;
            }

            await this.messageHandlers[messageJSON.type](messageJSON.data);
        }
    }

}

