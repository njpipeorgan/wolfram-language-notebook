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

const markdownLatexPlugin = require("./markdown-latex-plugin");
const MarkdownIt = require("markdown-it");
const domutils = require("domutils");
const htmlparser2 = require("htmlparser2");
import { tex2mml } from "./load-mathjax";

export function deserializeMarkup(markupText: string) {
  const cellData: {
    type: string; // Title, Section, Text, Input, ...
    label: string; // In[...]:= , Out[...]=
    text: string | any[];
  }[] = [];
  const md = new MarkdownIt({
    html: true
  }).use(markdownLatexPlugin);
  const html = md.render(markupText);
  const doc = htmlparser2.parseDocument(html);
  
  const paragraphTags = new Set([
    "blockquote", "div", "h1", "h2", "h3", "h4", "h5", "h6", "li", "ol", "p", "pre", "ul"
  ]);

  const handleContent = (element: any, pre: boolean = false, textOnly: boolean = false) => {
    const handleChildren = (pre: boolean, textOnly: boolean) => {
      const contents = (element?.children || []).map((e: any) => handleContent(e, pre, textOnly));
      return textOnly ? contents.join("") : contents;
    };
    if (typeof element === "string") {
      return element;
    } else if (element.type === "text") {
      return pre ? element.data.replace(/\n$/, " ") : element.data.replaceAll("\n", " ");
    } else if (element.name === "br") {
      return "\n";
    } else if (element.name === "li") {
      return domutils.getOuterHTML(element);
    } else if (!textOnly) {
      switch (element.name) {
        case "a":
          return {
            type: "Hyperlink",
            children: handleChildren(pre, textOnly),
            link: element?.attribs?.href || ""
          };
        case "button":
          return {
            type: "Button",
            children: handleChildren(pre, textOnly),
            link: element?.attribs?.onclick || ""
          };
        case "code":
          return { type: "Code", children: handleChildren(pre, true) };
        case "em":
        case "i":
          return { type: "Italic", children: handleChildren(pre, textOnly) };
        case "strong":
          return { type: "Bold", children: handleChildren(pre, textOnly) };
        case "s":
          return { type: "StrikeThrough", children: handleChildren(pre, textOnly) };
        case "small":
          return { type: "Smaller", children: handleChildren(pre, textOnly) };
        case "sup":
          return { type: "Superscript", children: handleChildren(pre, true) };
        case "sub":
          return { type: "Subscript", children: handleChildren(pre, true) };
        case "img":
          return {
            type: "Image",
            children: element?.attribs?.title || "[Image]",
            link: element?.attribs?.src || ""
          };
        case "tex":
          const tex = Buffer.from(handleChildren(pre, true), "base64").toString();
          return { type: "LaTeX", children: tex2mml(tex) };
      }
      return handleChildren(pre, textOnly);
    } else {
      return handleChildren(pre, true);
    }
  };

  const nonTerminalTagRules: { [key: string]: string[] } = {
    "": ["ol", "ul", "pre", "blockquote"],
    "ol": ["li"],
    "ul": ["li"],
    "li": ["ol", "ul", "pre"],
    "blockquote": ["blockquote", "pre"]
  };

  let tagStack: string[] = [];
  let isItemParagraphStack: boolean[] = [];
  let ignoreNextNChildren = 0;

  const handleElement = (element: any, nonTerminalTags: string[]) => {
    if (ignoreNextNChildren > 0) {
      --ignoreNextNChildren;
      return;
    }
    if (nonTerminalTags.indexOf(element?.name || "") >= 0) {
      tagStack.push(element.name);
      isItemParagraphStack.push(false);
      ignoreNextNChildren = 0;
      element.children.map((e: any) => handleElement(e, nonTerminalTagRules[element?.name] || []));
      ignoreNextNChildren = 0;
      tagStack.pop();
      isItemParagraphStack.pop();
    } else {
      const elementTag = element.type === "text" ? "text" : element.name;
      const parentTag = tagStack[tagStack.length - 1];
      if (elementTag.match(/h[1-6]/g)) {
        cellData.push({
          type: [
            "Title",
            "Chapter",
            "Section",
            "Subsection",
            "Subsubsection",
            "Subsubsubsection"][parseInt(elementTag.slice(1)) - 1],
          label: "",
          text: handleContent(element)
        });
      } else if (elementTag === "code") {
        cellData.push({
          type: "Text",
          label: "",
          text: handleContent(element, true)
        });
      } else if (elementTag === "hr") {
        cellData.push({
          type: "HorizontalLine",
          label: "",
          text: ""
        });
      } else {
        switch (parentTag) {
          case "li": {
            const listTags = tagStack.filter(tag => (tag === "ol" || tag === "ul"));
            const isOrderedList = (listTags[listTags.length - 1] === "ol");
            const listLevel = Math.min(Math.max(listTags.length, 1), 3);
            if (element?.data !== "\n") {
              const isItemParagraph = isItemParagraphStack[isItemParagraphStack.length - 1];
              const type = ["Item", "Subitem", "Subsubitem"][listLevel - 1] + (
                isItemParagraph ? "Paragraph" : isOrderedList ? "Numbered" : "");
              isItemParagraphStack[isItemParagraphStack.length - 1] = true;
              if (element.type === "tag" && paragraphTags.has(element.name)) {
                cellData.push({
                  type: type,
                  label: "",
                  text: handleContent(element)
                });
              } else {
                let groupedElements: any[] = [];
                ignoreNextNChildren = -1;
                while (element?.type === "text" || (
                  element?.type === "tag" && !paragraphTags.has(element?.name)
                )) {
                  ++ignoreNextNChildren;
                  groupedElements.push(element);
                  element = element.next;
                }
                cellData.push({
                  type: type,
                  label: "",
                  text: handleContent({
                    type: "tag",
                    name: "p",
                    children: groupedElements
                  })
                });
              }
            }
            break;
          }
          default: {
            if (element?.data !== "\n") {
              cellData.push({
                type: "Text",
                label: "",
                text: handleContent(element)
              });
            }
          }
        }
      }
    }
  };

  doc.children.map((element: any) => {
    try {
      handleElement(element, nonTerminalTagRules[""]);
    } catch (_) {
    }
  });

  return cellData;
}
