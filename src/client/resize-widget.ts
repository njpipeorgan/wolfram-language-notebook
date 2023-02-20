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

const MINIMUM_GRAPHICS_SIZE = 10;

const preventDefault = (e: any) => {
    e.preventDefault();
};
const addPreventDragStart = (elem: HTMLElement) => {
    elem.addEventListener("dragstart", preventDefault);
};
const removePreventDragStart = (elem: HTMLElement) => {
    elem.removeEventListener("dragstart", preventDefault);
};

export const addResizeWidget = (root: HTMLElement) => {
    const graphs = root.querySelectorAll("wgraph.resizable");
    for (let i = graphs.length - 1; i >= 0; --i) {
        const graph = graphs[i] as HTMLElement;
        addPreventDragStart(graph);
        if (graph.childElementCount > 0) {
            addPreventDragStart(graph.children[0] as HTMLElement);
        }

        graph.appendChild(document.createElement("div"));
        const widget = graph.lastChild as HTMLElement;
        widget.className = "resize-widget";
        widget.style.zIndex = "1000";
        widget.onpointerdown = (e: PointerEvent) => {
            const initialX = e.clientX;
            const initialWidth = (e.target as HTMLElement).parentElement?.offsetWidth || 0;
            widget.onpointermove = e => {
                const parent = widget.parentElement as HTMLElement;
                const aspectRatio = parent ? parseFloat(parent.getAttribute("aspect-ratio") || "") : NaN;
                if (!(aspectRatio > 0)) {
                    return;
                }
                let newWidth = e.clientX - initialX + initialWidth;
                if (aspectRatio <= 1.0 && newWidth < MINIMUM_GRAPHICS_SIZE) {
                    newWidth = MINIMUM_GRAPHICS_SIZE;
                } else if (aspectRatio > 1.0 && newWidth * aspectRatio < MINIMUM_GRAPHICS_SIZE) {
                    newWidth = MINIMUM_GRAPHICS_SIZE / aspectRatio;
                }
                parent.style.width = `${newWidth}px`;
                parent.style.height = `${newWidth * aspectRatio}px`;
            };
            widget.setPointerCapture(e.pointerId);
        };
        widget.onpointerup = e => {
            widget.onpointermove = null;
            widget.releasePointerCapture(e.pointerId);
        };
    }
};

export const removeResizeWidget = (root: HTMLElement) => {
    const widgets = root.querySelectorAll(".resize-widget");
    for (let i = widgets.length - 1; i >= 0; --i) {
        const widget = widgets[i];
        const parent = widget.parentElement;
        if (parent) {
            parent.removeChild(widget);
            if (parent.childElementCount > 0) {
                removePreventDragStart(parent.children[0] as HTMLElement);
            }
            removePreventDragStart(parent);
        }
    }
};
