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
import { readFileSync, writeFile } from "fs";

export class FileHandler {
    constructor() { }

    async writeAsync(path: string, text: string | Uint8Array) {
        writeFile(path, text, err => {
            if (!err) {
                return;
            }
            vscode.window.showErrorMessage(
                `Unable to write file ${path} \n${err.message}`,
                "Retry", "Save As...", "Dismiss"
            ).then(value => {
                if (value === "Retry") {
                    this.writeAsync(path, text);
                } else if (value === "Save As...") {
                    vscode.window.showSaveDialog({
                        defaultUri: vscode.Uri.file(path),
                        filters: { "All Files": ["*"] }
                    }).then(value => {
                        if (value) {
                            this.writeAsync(value.fsPath, text);
                        }
                    });
                }
            });
        });
    }

    readSync(path: string) {
        return readFileSync(path).toString();
    }
}
