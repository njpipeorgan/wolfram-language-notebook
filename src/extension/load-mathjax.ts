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

let mathjax: any = undefined;
require("mathjax").init({
  loader: { load: ['adaptors/liteDOM', 'input/tex-full', 'output/svg'] }
}).then((mathjaxInternal: any) => {
  mathjax = mathjaxInternal;
}).catch((err: any) => {
  console.log(err.message);
});


export const tex2mml = (tex: string, options?: { [key: string]: any }) => {
  try {
    return mathjax.tex2mml(tex, options);
  } catch (_) {
    return "Failed to parse TeX";
  }
};

export const tex2svg = (tex: string, options?: { [key: string]: any }) => {
  try {
    if (!mathjax) {
      throw Error("MathJax is not available yet");
    }
    try {
      return mathjax.startup.adaptor.outerHTML(mathjax.tex2svg(tex, options));
    } catch (_) {
      throw Error("Failed to parse TeX string");
    }
  } catch (e) {
    const html = tex
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
    return `<pre title="${(e as Error).message}">${html}</pre>`;
  }
};
