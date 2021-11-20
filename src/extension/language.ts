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

export const wlCompletionProvider: vscode.CompletionItemProvider<vscode.CompletionItem> = {
    provideCompletionItems: function(document, position, token, context) {
      const prefixText = document.getText(new vscode.Range(position.line, 0, position.line, position.character));
      const prefixWord = (prefixText.match(/[^$A-Z0-9]?([$A-Z][$A-Za-z0-9]*)$/) || [])[1];
      console.log(prefixText, prefixWord);
      if (!prefixWord) {
        return [] as vscode.CompletionItem[];
      }
      const range = new vscode.Range(position.line, position.character - prefixWord.length, position.line, position.character);
      console.log(range);
      return wlSymbolData.map(entry => {
        let docString = new vscode.MarkdownString(entry.usage, false);
        docString.supportHtml = true;
        docString.isTrusted = true;
        return {
          label: entry.name,
          kind: (entry.type === "function" ? vscode.CompletionItemKind.Function : vscode.CompletionItemKind.Constant),
          sortText: entry.rank.toString().padStart(5, "0"),
          documentation: docString,
          insertText: entry.name,
          range: range
        } as vscode.CompletionItem;
      });
    }
  };