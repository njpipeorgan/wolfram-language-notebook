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
import { WLNotebookSerializer } from "./serializer";
import {
  setWLSymbolData,
  wlCompletionProvider,
  wlHoverProvider,
} from "./language";
import {
  wlDocumentFormattingEditProvider
} from "./format-code";
import { readFileSync } from "fs";
import * as path from "path";
import {notebookController} from "./middle"
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.workspace.registerNotebookSerializer(
      "wolfram-language-notebook",
      new WLNotebookSerializer()
    )
  );

  context.subscriptions.push(
    notebookController.getController(),
    vscode.commands.registerCommand(
      "wolframLanguageNotebook.manageKernels",
      () => {
        notebookController.manageKernel();
      }
    ),
    vscode.commands.registerCommand(
      "wolframLanguageNotebook.newNotebook",
      async () => {
        const newNotebook = await vscode.workspace.openNotebookDocument(
          "wolfram-language-notebook",
          { cells: [] }
        );
        await vscode.commands.executeCommand("vscode.open", newNotebook.uri);
      }
    ),
    vscode.commands.registerCommand(
      "wolframLanguageNotebook.openConfigurations",
      () => {
        vscode.commands.executeCommand(
          "workbench.action.openSettings",
          "wolframLanguageNotebook"
        );
      }
    ),
    vscode.commands.registerCommand(
      "wolframLanguageNotebook.exportAs",
      (e: any) => {
        const activeUri = e?.notebookEditor?.notebookUri;
        if (activeUri) {
          notebookController.exportNotebook(activeUri);
        }
      }
    )
  );

  if (
    vscode.workspace
      .getConfiguration("wolframLanguageNotebook.editor")
      .get<Boolean>("languageFeatures")
  ) {
    setWLSymbolData(
      readFileSync(
        path.join(context.extensionPath, "resources", "wl-symbol-usages.txt")
      ).toString()
    );
    context.subscriptions.push(
      vscode.languages.registerCompletionItemProvider(
        "wolfram",
        wlCompletionProvider
      ),
      vscode.languages.registerHoverProvider("wolfram", wlHoverProvider),
      vscode.languages.registerDocumentFormattingEditProvider("wolfram", 
      wlDocumentFormattingEditProvider)
    );
  }
}

// This method is called when your extension is deactivated
export function deactivate() {}
