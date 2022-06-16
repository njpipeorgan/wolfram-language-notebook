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

import errorOverlay from "vscode-notebook-error-overlay";
import type { ActivationFunction } from "vscode-notebook-renderer";
import "../media/reset.css";
import "../media/render.css";
import * as renderUtils from "./render-utils";

// Fix the public path so that any async import()'s work as expected.
declare const __webpack_relative_entrypoint_to_root__: string;
declare const scriptUrl: string;

__webpack_public_path__ = new URL(scriptUrl.replace(/[^/]+$/, '') + __webpack_relative_entrypoint_to_root__).toString();

// ----------------------------------------------------------------------------
// This is the entrypoint to the notebook renderer's webview client-side code.
// This contains some boilerplate that calls the `render()` function when new
// output is available. You probably don't need to change this code; put your
// rendering logic inside of the `render()` function.
// ----------------------------------------------------------------------------

export const activate: ActivationFunction = context => {
  
  let mutationObservers: { [key: string]: MutationObserver | undefined } = {};

  return {
    renderOutputItem(outputItem, element) {
      // console.log(outputItem, element);
      element.innerHTML = "<div id=\"root\"></div>";
      const root = element.querySelector<HTMLElement>('#root')!;
      errorOverlay.wrap(root, () => {
        root.innerHTML = outputItem.text();
        let observer = mutationObservers[outputItem.id];
        const reconnect = () => {
          renderUtils.handleBoxes(root);
          // if (context.postMessage) {
          //   context.postMessage({
          //     type: "update-html",
          //     id: outputItem.id,
          //     value: root.innerHTML
          //   });
          // }
          observer?.observe(root, {
            subtree: true,
            childList: true,
            attributes: true,
            characterData: true,
          });
        };
        observer = new MutationObserver(() => {
          if (observer) {
            observer.disconnect();
            reconnect();
          }
        });
        reconnect();
        renderUtils.addResizeWidget(root);
      });
    },
    disposeOutputItem(outputId) {
      if (typeof outputId === "string") {
        let observer = mutationObservers[outputId];
        observer?.disconnect();
        delete mutationObservers[outputId];
      } else {
        Object.values(mutationObservers).forEach((observer) =>
          observer?.disconnect()
        );
        mutationObservers = {};
      }
    },
  };
};
