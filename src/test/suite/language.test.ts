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

import * as assert from "assert";
import { readFileSync } from "fs";
import path = require("path");
import * as vscode from "vscode";
import * as language from "../../extension/language";
import * as _ from "lodash";

suite("Completion and hover provider", () => {
  setup(() => {
    const extensionDevelopmentPath = path.resolve(__dirname, '../../../');
    language.setWLSymbolData(readFileSync(extensionDevelopmentPath + "/resources/wl-symbol-usages.txt").toString());
  });
  test("Wolfram Language symbol data", async () => {
    assert.ok(language.wlSymbolData.length > 0);
    assert.ok(language.wlSymbolData.findIndex(value => (value.name === "Plot")) >= 0);
  });
  test("Completion range with a word", async () => {
    {
      const document = await vscode.workspace.openTextDocument({content: "Plot[Sin" });
      const range = language.autoCompletionWordRange(document, new vscode.Position(0, 8), false);
      assert.ok(_.isEqual(range, new vscode.Range(0, 5, 0, 8)));
    }
    {
      const document = await vscode.workspace.openTextDocument({content: "Plot[Sin[x],{x" });
      const range = language.autoCompletionWordRange(document, new vscode.Position(0, 8), false);
      assert.ok(_.isEqual(range, new vscode.Range(0, 5, 0, 8)));
    }
    {
      const document = await vscode.workspace.openTextDocument({content: "Sin[x" });
      const range = language.autoCompletionWordRange(document, new vscode.Position(0, 3), false);
      assert.ok(_.isEqual(range, new vscode.Range(0, 0, 0, 3)));
    }
  });
  test("Completion range with no word", async () => {
    {
      const document = await vscode.workspace.openTextDocument({content: "Sin[" });
      const range = language.autoCompletionWordRange(document, new vscode.Position(0, 4), false);
      assert.ok(_.isEqual(range, new vscode.Range(0, 4, 0, 4)));
    }
    {
      const document = await vscode.workspace.openTextDocument({content: "" });
      const range = language.autoCompletionWordRange(document, new vscode.Position(0, 0), false);
      assert.ok(_.isEqual(range, new vscode.Range(0, 0, 0, 0)));
    }
  });
  test("Get usage item", async () => {
    const range = new vscode.Range(0, 5, 0, 10);
    const item = language.wlSymbolEntryToUsageItem(language.wlSymbolData[0], range);
    assert.ok(_.isEqual(item.range, range));
    assert.ok(item.label.length > 0);
    assert.ok(item.sortText.length > 0);
    assert.ok(item.insertText.length > 0);
  });
  test("Hover provider", async () => {
    const document = await vscode.workspace.openTextDocument({content: "Plot[Sin[x],{x" });
    const element = language.wlHoverProvider.provideHover(
      document, new vscode.Position(0, 6),
      (new vscode.CancellationTokenSource()).token) as vscode.Hover;
    assert.ok((element.contents[0] as vscode.MarkdownString).value.length > 0);
  });
});
