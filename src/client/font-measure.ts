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

let fontMetricCache : {[key: string]: {middle: number, baseline: number}} = {};

export const getFontMetric = (font: string) => {
  if (fontMetricCache[font] === undefined) {
    let body = document.querySelector("body");
    if (!body) {
      fontMetricCache[font] = { middle: 0, baseline: 0 };
      return fontMetricCache[font];
    }
    let canvas = document.createElement("div");
    canvas.className = "font-measure-canvas";
    canvas.setAttribute("style", `font-size:512px;font-family:${font};`);
    
    canvas.innerHTML = `<div>x</div><div style="vertical-align:middle;">x</div><div style="font-size:50%;">x</div>`;
    body.appendChild(canvas);
    const boxes = Array.from(canvas.children).map(e => e.getBoundingClientRect());
  
    const height = boxes[0].height;
    const middle = (boxes[1].top - boxes[0].top + 0.5 * boxes[1].height) / height;
    const baseline = ((boxes[2].top - boxes[0].top) / (1.0 - (boxes[2].height / boxes[0].height))) / height;
  
    fontMetricCache[font] = { middle, baseline };
  }
  return fontMetricCache[font];
};
