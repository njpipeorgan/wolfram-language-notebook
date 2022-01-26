import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");
  
  test("New notebook", async () => {
    await vscode.commands.executeCommand("wolframLanguageNotebook.newNotebook");
    assert.ok(vscode.workspace.notebookDocuments.length > 0);
    const notebookPath = vscode.workspace.notebookDocuments[0]?.uri?.fsPath;
    assert.ok(typeof notebookPath === "string");
  });
  test("New notebook", async () => {
    await vscode.commands.executeCommand("wolframLanguageNotebook.newNotebook");
    assert.ok(vscode.workspace.notebookDocuments.length > 0);
    const notebookPath = vscode.workspace.notebookDocuments[0]?.uri?.fsPath;
    assert.ok(typeof notebookPath === "string");
  });

  test("Manage kernels", async () => {
    await vscode.commands.executeCommand("wolframLanguageNotebook.manageKernels");
    await new Promise(resolve => setTimeout(resolve, 500));
    await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');
    await new Promise(resolve => setTimeout(resolve, 20000));
  });
});
