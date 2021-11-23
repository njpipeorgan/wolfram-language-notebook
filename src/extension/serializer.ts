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
const MarkdownIt = require("markdown-it");
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
  const md = new MarkdownIt({
    html: true
  });
  const html = md.render(markupText);
  const doc = htmlparser2.parseDocument(html);

  let tagStack: string[] = [];
  let isItemParagraphStack: boolean[] = [];

  const handleContent = (element: any, pre: boolean = false) => {
    if (typeof element === "string") {
      return element;
    } else if (element.type === "text") {
      return pre ? element.data.replace(/\n$/, " ") : element.data.replaceAll("\n", " ");
    } else if (element.name === "br") {
      return "\n";
    } else if (element.name === "li") {
      return domutils.getOuterHTML(element);
    } else {
      return (element?.children || []).map((e: any) => handleContent(e, pre)).join("");
    }
  };

  const nonTerminalTagRules: { [key: string]: string[] } = {
    "": ["ol", "ul", "pre", "blockquote"],
    "ol": ["li"],
    "ul": ["li"],
    "li": ["ol", "ul", "pre"],
    "blockquote": ["blockquote", "pre"]
  };

  const handleElement = (element: any, nonTerminalTags: string[]) => {
    if (nonTerminalTags.indexOf(element?.name || "") >= 0) {
      tagStack.push(element.name);
      isItemParagraphStack.push(false);
      element.children.map((e: any) => handleElement(e, nonTerminalTagRules[element?.name] || []));
      tagStack.pop();
      isItemParagraphStack.pop();
    } else {
      const elementTag = element.type === "text" ? "text" : element.name;
      const parentTag = tagStack[tagStack.length - 1];
      if (elementTag.match(/h[1-6]/g)) {
        cellData.push({
          type: [
            "Title",
            "Chapter",
            "Section",
            "Subsection",
            "Subsubsection",
            "Subsubsubsection"][parseInt(elementTag.slice(1)) - 1],
          label: "",
          text: handleContent(element)
        });
      } else if (elementTag === "code") {
        cellData.push({
          type: "CodeText",
          label: "",
          text: handleContent(element, true)
        });
      } else if (elementTag === "hr") {
        cellData.push({
          type: "HorizontalLine",
          label: "",
          text: ""
        });
      } else {
        switch (parentTag) {
          case "li": {
            const listTags = tagStack.filter(tag => (tag === "ol" || tag === "ul"));
            const isOrderedList = (listTags[listTags.length - 1] === "ol");
            const listLevel = Math.min(Math.max(listTags.length, 1), 3);
            if (element?.data !== "\n") {
              const isItemParagraph = isItemParagraphStack[isItemParagraphStack.length - 1];
              const type = ["Item", "Subitem", "Subsubitem"][listLevel - 1] + (
                isItemParagraph ? "Paragraph" : isOrderedList ? "Numbered" : "");
              isItemParagraphStack[isItemParagraphStack.length - 1] = true;
              cellData.push({
                type: type,
                label: "",
                text: handleContent(element)
              });
            }
            break;
          }
          default: {
            if (element?.data !== "\n") {
              cellData.push({
                type: "Text",
                label: "",
                text: handleContent(element)
              });
            }
          }
        }
      }
      
    }
  };

  doc.children.map((element: any) => {
    handleElement(element, nonTerminalTagRules[""]);
  });

  return cellData;
}
