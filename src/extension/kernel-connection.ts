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
let zmq: typeof import("zeromq") | undefined;
try {
    zmq = require("zeromq") as typeof import("zeromq");
} catch (error) {
    vscode.window.showWarningMessage((error as Error).message);
    zmq = undefined;
}

export interface KernelMessage {
    type: string,
    [key: string]: any
}

export class WLKernelConnection {
    private kernel?: child_process.ChildProcess;
    private socket?: import("zeromq").Pair;
    private restartAfterExitKernel = false;
    private connectingtoKernel = false;
    private messageHandlers: { [type: string]: (data: any) => void | Promise<void> } = {};

    constructor() {
    }

    postMessage(message: KernelMessage) {
        if (this.socketIsAlive()) {
            this.socket?.send(JSON.stringify(message));
        } else {
            WLNotebookOutputPanel.print("The socket is not available; cannot post the message.");
        }
    }

    registerMessageHandler(type: string, handler: (data: any) => void | Promise<void>) {
        this.messageHandlers[type] = handler;
    }

    private kernelIsAlive() {
        return this.kernel && !this.kernel.killed;
    }

    private socketIsAlive() {
        return this.socket && !this.socket.closed;
    }

    private closeSocket() {
        if (this.socketIsAlive()) {
            this.socket?.close();
        }
        this.socket = undefined;
    }

    private async receiveAndHandleMessages() {
        let SOCKET_AVAILABILITY_CHECK_INTERVAL = 500; // ms
        while (true) {
            if (this.socket === undefined) {
                await new Promise(resolve => setTimeout(resolve, SOCKET_AVAILABILITY_CHECK_INTERVAL));
                continue;
            }
            let [message] = await this.socket.receive().catch(() => {
                if (this.kernelIsAlive()) {
                    WLNotebookOutputPanel.print(`Failed to receive messages from the kernel, but the kernel appears to be alive.`);
                }
                this.closeSocket();
                return [new Error("Failed to receive message")];
            });
            if (message instanceof Error) {
                continue;
            }

            let messageString = Buffer.from(message).toString("utf-8");
            let messageJSON: any;
            try {
                messageJSON = JSON.parse(messageString);
            } catch (error) {
                WLNotebookOutputPanel.print("Failed to parse the following message into JSON:");
                WLNotebookOutputPanel.print(messageString);
                continue;
            }

            if (typeof messageJSON.type !== "string") {
                WLNotebookOutputPanel.print("The following message does not contain the \"type\" field:");
                WLNotebookOutputPanel.print(messageString);
                continue;
            }

            if (this.messageHandlers[messageJSON.type] === undefined) {
                WLNotebookOutputPanel.print(`No handler for the following message type: ${messageJSON.type}`);
                continue;
            }

            await this.messageHandlers[messageJSON.type](messageJSON.data);
        }
    }

}

