import * as vscode from "vscode";
import { WLNotebookSerializer } from "./serializer";
import { WLNotebookController } from "./controller";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.workspace.registerNotebookSerializer("wolfram-language-notebook", new WLNotebookSerializer())
  );
  const notebookController = new WLNotebookController();
  context.subscriptions.push(notebookController.getController());
  context.subscriptions.push(vscode.commands.registerCommand("wolframLanguageNotebook.manageKernels", () => {
    notebookController.manageKernel();
  }));
}

// This method is called when your extension is deactivated
export function deactivate() {
}
