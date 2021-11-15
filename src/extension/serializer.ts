const util = require("util");
import * as vscode from "vscode";

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
    let notebook = JSON.parse(decoder.decode(content)) as WLNotebookData;
    for (let cell of notebook.cells) {
      if (cell.outputs) {
        for (let output of cell.outputs) {
          for (let item of output.items) {
            item.data = encoder.encode(item.data);
          }
        }
      }
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
    for (let cell of notebook.cells) {
      if (cell.outputs) {
        for (let output of cell.outputs) {
          for (let item of output.items) {
            item.data = decoder.decode(item.data);
                  }
        }
      }
    }
    return encoder.encode(JSON.stringify(notebook, null, 1));
  }
}
  