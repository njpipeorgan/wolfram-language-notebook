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
import { Disposable } from "./disposable";

export class KernelStatusBarItem extends Disposable {
	private item: vscode.StatusBarItem;
	private readonly baseText = " Wolfram Kernel";
	private kernelIsActive = false;
	private editorIsActive = true;

	constructor(supportedLanguages: string[]) {
		super();
		this.item = vscode.window.createStatusBarItem(
			"wolfram-language-notebook-kernel-status", vscode.StatusBarAlignment.Right, 100
		);
		this.registerDisposable(this.item);
		this.item.name = "Wolfram Kernel";
		this.item.command = "wolframLanguageNotebook.manageKernels";
		this.setDisconnected();
		this.updateVisibility();

		this.registerDisposable(vscode.window.onDidChangeActiveTextEditor(e => {
			this.editorIsActive = Boolean(e?.document && supportedLanguages.includes(e.document.languageId));
			this.updateVisibility();
		}));
	}

	private updateVisibility() {
		if (this.kernelIsActive || this.editorIsActive) {
			this.item.show();
		} else {
			this.item.hide();
		}
	}

	private setState(active: boolean, icon: string, tooltip: string) {
		this.kernelIsActive = active;
		this.item.text = icon + this.baseText;
		this.item.tooltip = tooltip;
		this.updateVisibility();
	}

	setDisconnected() {
		this.setState(false, "$(close)", "Currently not connected to a kernel");
	}

	setConnecting() {
		this.setState(true, "$(loading~spin)", "Connecting to the kernel");
	}

	setConnected(tooltip: string = "", isRemote: boolean = false) {
		this.setState(true, (isRemote ? "$(remote)" : "$(check)"), tooltip || "Kernel connected");
	}
}

export class ExportNotebookStatusBarItem extends Disposable {
	private item: vscode.StatusBarItem;

	constructor() {
		super();
		this.item = vscode.window.createStatusBarItem(
			"wolfram-language-export-notebook-status", vscode.StatusBarAlignment.Right, 101
		);
		this.item.name = "Export Notebook";
		this.item.text = "$(loading~spin) Generating Notebook";
		this.item.command = "wolframLanguageNotebook.manageKernels";
		this.item.hide();
		this.registerDisposable(this.item);
	}

	show() {
		this.item.show();
	}

	hide() {
		this.item.hide();
	}
}
