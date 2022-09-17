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

interface WLNotebookData {
  cells: {
    kind: vscode.NotebookCellKind;
    languageId: string;
    value: string;
    outputs?: {
      items: {
        mime: string,
        data: string | Uint8Array
      }[];
      metadata?: { [key: string]: any };
    }[];
    executionSummary?: vscode.NotebookCellExecutionSummary;
    metadata?: { [key: string]: any };
  }[];
  metadata?: { [key: string]: any };
}

export class WLNotebookSerializer implements vscode.NotebookSerializer {
  async deserializeNotebook(
    content: Uint8Array,
    _token: vscode.CancellationToken
  ): Promise<vscode.NotebookData> {
    const decoder = new util.TextDecoder();
    const encoder = new util.TextEncoder();
    let notebook: WLNotebookData;
    try {
      notebook = JSON.parse(decoder.decode(content)) as WLNotebookData;
      for (let cell of notebook.cells) {
        if (cell.executionSummary) {
          // execution summary is session-specific
          cell.executionSummary = undefined;
        }
        if (cell.outputs) {
          for (const output of cell.outputs) {
            for (const item of output.items) {
              item.data = encoder.encode(item.data as string);
            }
          }
        }
      };
    } catch (_) {
      notebook = { cells: [] };
    }
    return notebook as vscode.NotebookData;
  }

  async serializeNotebook(
    data: vscode.NotebookData,
    _token: vscode.CancellationToken
  ): Promise<Uint8Array> {
    const decoder = new util.TextDecoder();
    const encoder = new util.TextEncoder();
    let notebook = data as WLNotebookData;
    try {
      for (const cell of notebook.cells) {
        if (cell.outputs) {
          for (const output of cell.outputs) {
            for (const item of output.items) {
              item.data = decoder.decode(item.data as Uint8Array);
            }
          }
        }
      }
    } catch (_) {
      notebook = { cells: [] };
    }
    return encoder.encode(JSON.stringify(notebook, null, 1));
  }
}
