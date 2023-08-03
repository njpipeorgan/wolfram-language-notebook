/**
 * Format the code
 *
 */
import * as vscode from "vscode";
import { notebookController } from "./middle"
const formatString = async (s: string) => {
    let res: string;

    return (await notebookController.formatCode(s))
}
export const wlDocumentFormattingEditProvider: vscode.DocumentFormattingEditProvider =
{
    async provideDocumentFormattingEdits(document, options, token) {
        const cellContent: string[] = [];
        for (let i = 0; i < document.lineCount; i++) {
            cellContent.push(document.lineAt(i).text);
        }
        const cellContentString = cellContent.join("\n");

        return [
            vscode.TextEdit.replace(
                new vscode.Range(
                    new vscode.Position(0, 0),
                    new vscode.Position(
                        document.lineCount - 1,
                        document.lineAt(document.lineCount - 1).text.length,
                    ),
                ),
                // Here needs a function to format the code
                await formatString(cellContentString)
            ),
        ];
    },
};
