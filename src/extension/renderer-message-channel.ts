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
const path = require("path");
import { FileHandler } from "./file-handler";

export function createWLRendererMessageChannel(fileHandler: FileHandler) {
    const messageChannel = vscode.notebooks.createRendererMessaging("wolfram-language-notebook-renderer");
    messageChannel.onDidReceiveMessage(async e => {
        // console.log("Received message from renderer: " + JSON.stringify(e));
        if (e.message.request === "save-as") {
            const notebookPath = e.editor.notebook.uri.fsPath;
            const notebookDir = path.dirname(notebookPath);
            const pngPath = path.join(notebookDir, "*.png");
            const uriData = e.message.data;
            const base64Data = uriData.replace(/^data:image\/png;base64,/, "");
            vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(pngPath),
                filters: {
                    "PNG": ["png"],
                    "All Files": ["*"]
                }
            }).then(value => {
                if (value) {
                    fileHandler.writeAsync(value.fsPath, new Uint8Array(Buffer.from(base64Data, "base64")));
                }
            });
        }
    });
    return messageChannel;
}
