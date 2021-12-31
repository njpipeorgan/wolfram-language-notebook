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

let wlSymbolData: {
  name: string,
  type: string,
  version: number,
  rank?: number,
  url?: string,
  usage?: string
}[] = [];

export function setWLSymbolData(data: string) {
  wlSymbolData = data.split("\n").map(line => {
    try {
      return JSON.parse(line);
    } catch (err) {
      console.log(err, line);
      return null;
    }
  }).filter(line => line !== null);
};

const completionItemTypeTable: { [key: string]: vscode.CompletionItemKind } = {
  "function": vscode.CompletionItemKind.Function,
  "variable": vscode.CompletionItemKind.Variable,
  "keyword": vscode.CompletionItemKind.Keyword,
  "constant": vscode.CompletionItemKind.Constant
};

export const wlCompletionProvider: vscode.CompletionItemProvider<vscode.CompletionItem> = {
  provideCompletionItems: function(document, position, token, context) {
    const defaultItems = [] as vscode.CompletionItem[];
    const prefixText = document.getText(new vscode.Range(position.line, 0, position.line, position.character));

    if (token.isCancellationRequested) {
      return defaultItems;
    }
    const prefixWord = (prefixText.match(/[^$A-Z0-9]?([$A-Z][$A-Za-z0-9]*)$/) || ["", ""])[1];
    const range = new vscode.Range(position.line, position.character - prefixWord.length, position.line, position.character);

    let items: vscode.CompletionItem[] = [];
    wlSymbolData.forEach(entry => {
      if (token.isCancellationRequested) {
        return defaultItems;
      }
      let docString = new vscode.MarkdownString(entry?.usage || "", false);
      docString.supportHtml = true;
      docString.isTrusted = true;
      items.push({
        label: entry.name,
        kind: completionItemTypeTable[entry.type] || vscode.CompletionItemKind.Text,
        sortText: (entry?.rank || 99999).toString().padStart(5, "0"),
        documentation: docString,
        insertText: entry.name,
        range: range
      });
    });
    return items;
  }
};

export const wlHoverProvider: vscode.HoverProvider = {
  provideHover: function(document, position, token) {
    const wordRange = document.getWordRangeAtPosition(position, /[$A-Za-z][$A-Za-z0-9]*/);
    const word = wordRange ? document.getText(wordRange) : "";
    if (!word) {
      return null;
    }
    const entry = wlSymbolData.find(entry => entry.name === word);
    if (!entry || !entry?.usage) {
      return null;
    }
    let hoverStrings = entry.usage.split("\\n\\n---\\n");
    if (entry?.url) {
      hoverStrings.push(`[Online Documentation »](${entry.url})`);
    }
    const hoverElement = new vscode.Hover(hoverStrings.map(str => {
      let md = new vscode.MarkdownString(str);
      md.isTrusted = true;
      md.supportHtml = true;
      return md;
    }));
    return hoverElement;
  }
};
