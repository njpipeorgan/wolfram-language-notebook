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

export class NotebookConfig {
  // private config: vscode.WorkspaceConfiguration;
  private disposables: any[] = [];

  constructor() {
    // this.config = vscode.workspace.getConfiguration("wolframLanguageNotebook");
  }

  dispose() {
    this.disposables.forEach(item => {
      item.dispose();
    });
  }

  onDidChange(callback: (config: NotebookConfig) => unknown) {
    this.disposables.push(vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration("wolframLanguageNotebook")) {
        callback(this);
      }
    }));
  }

  get(configName: string) {
    return vscode.workspace.getConfiguration("wolframLanguageNotebook").get(configName);
  }

  async update(configName: string, value: any, configurationTarget: any) {
    return await vscode.workspace.getConfiguration("wolframLanguageNotebook").update(
      configName, value, configurationTarget);
  }

  getKernelRelatedConfigs() {
    const configNames = [
      "frontEnd.storeOutputExpressions",
      "rendering.outputSizeLimit",
      "rendering.renderByWolframPlayer",
      "rendering.wolframplayerPath",
      "rendering.boxesTimeLimit",
      "rendering.htmlTimeLimit",
      "rendering.htmlMemoryLimit",
      "rendering.imageWithTransparency",
      "rendering.renderAsImages",
      "rendering.invertBrightnessInDarkThemes"
    ];
    const renderingConfig = vscode.workspace.getConfiguration("wolframLanguageNotebook");
    let config: { [key: string]: any } = {};
    configNames.forEach(name => {
      config[name.split('.').pop() as string] = renderingConfig.get(name);
    });
    return config;
  }

}
