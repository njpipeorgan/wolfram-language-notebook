 
/**
 * Format the code
 *
 */
 import * as vscode from 'vscode';
 const formatString = (s: string) => {
     return `${s}\nnot yet`;
 }
 
 export const wlDocumentFormattingEditProvider: vscode.DocumentFormattingEditProvider = {
     provideDocumentFormattingEdits(document, options, token) {
         const cellContent: string[] = [];
         for (let i = 0; i < document.lineCount; i++) {
             cellContent.push(document.lineAt(i).text);
         }
         const cellContentString = cellContent.join("\n");
 
 
         return [
             vscode.TextEdit.replace(
                 new vscode.Range(
                     new vscode.Position(0, 0),
                     new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length)
                 ),
                 // Here needs a function to format the code
                 formatString(cellContentString))
         ]
     },
 }
 