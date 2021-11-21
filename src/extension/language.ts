import Token = require("markdown-it/lib/token");
import * as vscode from "vscode";

let wlSymbolData: any[] = [];

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
      const prefixWord = (prefixText.match(/[^$A-Z0-9]?([$A-Z][$A-Za-z0-9]*)$/) || [])[1];
      const range = new vscode.Range(position.line, position.character - prefixWord.length, position.line, position.character);

      let items: vscode.CompletionItem[] = [];
      wlSymbolData.forEach(entry => {
        if (token.isCancellationRequested) {
          return defaultItems;
        }
        let docString = new vscode.MarkdownString(entry.usage, false);
        docString.supportHtml = true;
        docString.isTrusted = true;
        items.push({
          label: entry.name,
          kind: completionItemTypeTable[entry.type as string] || vscode.CompletionItemKind.Text,
          sortText: entry.rank.toString().padStart(5, "0"),
          documentation: docString,
          insertText: entry.name,
          range: range
        });
      });
      return items;
    }
  };