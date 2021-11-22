// import { render } from './render';
import errorOverlay from 'vscode-notebook-error-overlay';
import type { ActivationFunction } from 'vscode-notebook-renderer';
import '../media/reset.css';
import '../media/render.css';
const renderUtils = require("./render-utils");

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
          if (observer) {
            observer.observe(root, {
              subtree: true,
              childList: true,
              attributes: true,
              characterData: true
            });
          }
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
        if (observer) {
          observer.disconnect();
        }
        delete mutationObservers[outputId];
      } else {
        for (let id in mutationObservers) {
          let observer = mutationObservers[id];
          if (observer) {
            observer.disconnect();
          }
        }
        mutationObservers = {};
      }
    }
  };
};
