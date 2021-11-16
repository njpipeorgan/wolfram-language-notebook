import * as vscode from "vscode";
const util = require("util");
const marked = require("marked");
const domutils = require("domutils");
const htmlparser2 = require("htmlparser2");

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
    // console.log("content = ");
    // console.log(decoder.decode(content));
    let notebook: WLNotebookData;
    try {
      notebook = JSON.parse(decoder.decode(content)) as WLNotebookData;
      for (let cell of notebook.cells) {
        if (cell.outputs) {
          for (let output of cell.outputs) {
            for (let item of output.items) {
              item.data = encoder.encode(item.data);
            }
          }
        }
      }
    } catch (e) {
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
      for (let cell of notebook.cells) {
        if (cell.outputs) {
          for (let output of cell.outputs) {
            for (let item of output.items) {
              item.data = decoder.decode(item.data);
              }
          }
        }
      }
    } catch (e) {
      notebook = { cells: [] };
    }
    return encoder.encode(JSON.stringify(notebook, null, 1));
  }
}

export function deserializeMarkup(markupText: string) {
  const cellData: {
    type: string; // Title, Section, Text, Input, ...
    label: string; // In[...]:= , Out[...]=
    text: string;
  }[] = [];
  const html = marked.marked(markupText);
  const doc = htmlparser2.parseDocument(html);

  const tagToHeader: { [key: string]: string } = {
    "h1": "Title",
    "h2": "Chapter",
    "h3": "Section",
    "h4": "Subsection",
    "h5": "Subsubsection",
    "h6": "Subsubsubsection"
  };
  
  const handleContent = (element: any) => {
    return domutils.getInnerHTML(element);
  };

  const handleElement = (element: any) => {
    if (!(element?.type)) {
      return;
    }
    if (element?.type === "tag") {
      if (tagToHeader.hasOwnProperty(element.name)) {
        cellData.push({
          type: tagToHeader[element.name],
          label: "",
          text: handleContent(element)
        });
      } else {
        cellData.push({
          type: "Text",
          label: "",
          text: handleContent(element)
        });
      }
    }
  };

  console.log(doc);
  doc.children.map((element: any) => {
    handleElement(element);
  });

  return cellData;
}
  