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
  context.subscriptions.push(vscode.commands.registerCommand("wolframLanguageNotebook.newNotebook", () => {
    vscode.workspace.openNotebookDocument("wolfram-language-notebook", {cells: []}).then(e => {
      vscode.commands.executeCommand('vscode.open', e.uri);
    });
  }));
  context.subscriptions.push(vscode.commands.registerCommand("wolframLanguageNotebook.openConfigurations", () => {
    vscode.commands.executeCommand("workbench.action.openSettings", "wolframLanguageNotebook");
  }));
  // context.subscriptions.push(vscode.commands.registerCommand("wolframLanguageNotebook.exportAs", (e: any) => {
  //   const activeUri = e?.notebookEditor?.notebookUri;
  //   console.log(activeUri);
  //   if (activeUri) {
  //     notebookController.exportNotebook(activeUri);
  //   }
  // }));
}

// This method is called when your extension is deactivated
export function deactivate() {
}
