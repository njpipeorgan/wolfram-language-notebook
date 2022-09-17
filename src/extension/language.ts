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

type WLSymbolEntry = {
  name: string,
  type: string,
  version: number,
  rank?: number,
  url?: string,
  usage?: string
};

export let wlSymbolData: WLSymbolEntry[] = [];

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

export const autoCompletionWordRange = (
  document: vscode.TextDocument, position: vscode.Position, caseSensitive: boolean
) => {
  const prefixText = document.getText(new vscode.Range(position.line, 0, position.line, position.character));
  let regex = caseSensitive ? /(?:^|[^$A-Za-z])([$A-Z][$A-Za-z0-9]*)$/ : /(?:^|[^$A-Za-z])([$A-Za-z][$A-Za-z0-9]*)$/;
  const prefixWord = (prefixText.match(regex) || ["", ""])[1];
  return new vscode.Range(position.line, position.character - prefixWord.length, position.line, position.character);
};

export const wlSymbolEntryToUsageItem = (entry: WLSymbolEntry, range: vscode.Range) => {
  let docString = new vscode.MarkdownString(entry?.usage || "", false);
  docString.supportHtml = true;
  docString.isTrusted = true;
  return {
    label: entry.name,
    kind: completionItemTypeTable[entry.type] || vscode.CompletionItemKind.Text,
    sortText: (entry?.rank ?? 99999).toString().padStart(5, "0"),
    documentation: docString,
    insertText: entry.name,
    range: range
  };
};

export const wlCompletionProvider: vscode.CompletionItemProvider<vscode.CompletionItem> = {
  provideCompletionItems(document, position, token, context) {
    const defaultItems = [] as vscode.CompletionItem[];
    const editorConfig = vscode.workspace.getConfiguration("wolframLanguageNotebook.editor");
    const caseSensitive = ((editorConfig.get("caseSensitiveAutocompletion") as boolean) === true);
    const range = autoCompletionWordRange(document, position, caseSensitive);
    if (range.isEmpty) {
      return defaultItems;
    }
    let items: vscode.CompletionItem[] = [];
    wlSymbolData.forEach(entry => {
      if (token.isCancellationRequested) {
        return defaultItems;
      }
      items.push(wlSymbolEntryToUsageItem(entry, range));
    });
    return items;
  }
};

export const wlHoverProvider: vscode.HoverProvider = {
  provideHover(document, position, token) {
    const wordRange = document.getWordRangeAtPosition(position, /[$A-Za-z][$A-Za-z0-9]*/);
    const word = wordRange ? document.getText(wordRange) : "";
    if (!word) {
      return null;
    }
    const entry = wlSymbolData.find(entry => entry.name === word);
    if (!(entry && entry?.usage)) {
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
