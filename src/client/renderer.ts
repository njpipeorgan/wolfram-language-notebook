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

import * as FontMeasure from "./font-measure";
import { renderGraphics3D } from "./renderer-graphics3d";

const MINIMUM_FONT_SIZE_PT = 8.0;
const MINIMUM_FONT_SIZE_PX = MINIMUM_FONT_SIZE_PT * (96.0 / 72.0);

type Style = {
    fontSize: number,
    fontFamily: string,
    fontMetric: { middle: number, baseline: number },
    lineHeight: number
};

const WEXPR_BASE_STYLE: Style = {
    fontFamily: "'Consolas', 'wlsupplement'",
    fontSize: 14.0,
    lineHeight: 1.1,
    fontMetric: FontMeasure.getFontMetric("Consolas")
};

let boxMutations: (() => any)[] = [];

const registerBoxMutation = (mutation: () => any) => {
    boxMutations.push(mutation);
};

const clearBoxMutations = () => {
    boxMutations.forEach(mutation => mutation());
    boxMutations.length = 0;
};

export const handleWExpr = (root: HTMLElement) => {
    try {
        const element = root.querySelector<HTMLElement>(".wexpr > :first-child");
        if (element) {
            handleBox(element, WEXPR_BASE_STYLE);
            clearBoxMutations();
        }
    } catch (e) {
        console.warn(e);
    }
};

const handleBox = (elem: HTMLElement, style: Style) => {
    const handlerTable:
        { [key: string]: (elem: HTMLElement, style: Style) => number[] } = {
        /* eslint-disable */
        "W": handleStringBox,
        "WROW": handleRowBox,
        "WSUP": handleSuperscriptBox,
        "WSUB": handleSubscriptBox,
        "WSUBSUP": handleSubsuperscriptBox,
        "WOVER": handleOverscriptBox,
        "WUNDER": handleUnderscriptBox,
        "WUNDEROVER": handleUnderoverscriptBox,
        "WFRAC": handleFractionBox,
        "WSQRT": handleSqrtBox,
        "WGRID": handleGridBox,
        "WFRAME": handleFrameBox,
        "WPANE": handlePaneBox,
        "WGRAPH": handleGraphicsBox,
        "WGRAPH3D": handleGraphics3DBox
        /* eslint-enable */
    };
    if (handlerTable[elem.tagName] === undefined) {
        console.log(`Unknown element: ${elem.tagName}`);
        return [0, 0];
    } else {
        const span = handlerTable[elem.tagName](elem, style);
        if (span.length === 2 &&
            (-Infinity < span[0] && span[0] < Infinity) &&
            (-Infinity < span[1] && span[1] < Infinity)) {
            return span;
        } else {
            return [0, 0];
        }
    }
};

const elementSpanMerge = (a: number[], b: number[]) => [Math.max(a[0], b[0]), Math.max(a[1], b[1])];
const elementSpanAdd = (span: number[], offset: number) => [span[0] + offset, span[1] - offset];
const elementSpanToString = (span: number[]) => `${span[0].toFixed(2)} ${span[1].toFixed(2)}`;

const parseCssLength = (value: string, reference = NaN) => {
    if (value === "") {
        return NaN;
    } else if (value[value.length - 1] === "%") {
        return reference * (0.01 * parseFloat(value.substring(0, value.length - 1)));
    } else if (value.substring(value.length - 2) === "pt") {
        return parseFloat(value.substring(0, value.length - 2)) * (96.0 / 72.0);
    } else {
        return parseFloat(value);
    }
};

const bracketRenderScheme: { [key: string]: string[][] } = {
    "(": [["&#xe010;"], ["&#xe012;"], ["&#xe014;", "&#xe015;", "&#xe000;"]],
    ")": [["&#xe011;"], ["&#xe013;"], ["&#xe016;", "&#xe017;", "&#xe001;"]],
    "[": [["&#xe018;"], ["&#xe01a;"], ["&#xe01c;", "&#xe01d;", "&#xe000;"]],
    "]": [["&#xe019;"], ["&#xe01b;"], ["&#xe01e;", "&#xe01f;", "&#xe001;"]],
    "{": [["&#xe050;"], ["&#xe052;"], ["&#xe054;"], ["&#xe056;"], ["&#xe058;", "&#xe059;", "&#xe05a;", "&#xe002;"]],
    "}": [["&#xe051;"], ["&#xe053;"], ["&#xe055;"], ["&#xe057;"], ["&#xe05b;", "&#xe05c;", "&#xe05d;", "&#xe002;"]],
    "\u2308": [["&#xe020;"], ["&#xe022;"], ["&#xe024;", "&#xe025;", "&#xe000;"]], // LeftCeiling
    "\u2309": [["&#xe021;"], ["&#xe023;"], ["&#xe026;", "&#xe027;", "&#xe001;"]], // RightCeiling
    "\u230a": [["&#xe028;"], ["&#xe02a;"], ["&#xe02c;", "&#xe02d;", "&#xe000;"]], // LeftFloor
    "\u230b": [["&#xe029;"], ["&#xe02b;"], ["&#xe02e;", "&#xe02f;", "&#xe001;"]], // RightFloor
    "\u301a": [["&#xe030;"], ["&#xe032;"], ["&#xe034;", "&#xe035;", "&#xe003;"]], // LeftDoubleBracket
    "\u301b": [["&#xe031;"], ["&#xe033;"], ["&#xe036;", "&#xe037;", "&#xe004;"]], // RightDoubleBracket
    "\u2329": [["&#xe038;"], ["&#xe03a;"], ["&#xe03c;", "&#xe03d;"]], // LeftAngleBracket
    "\u232a": [["&#xe039;"], ["&#xe03b;"], ["&#xe03e;", "&#xe03f;"]], // RightAngleBracket
    "\uf113": [["&#xe040;"], ["&#xe042;"], ["&#xe044;", "&#xe045;"]], // LeftAssociation
    "\uf114": [["&#xe041;"], ["&#xe043;"], ["&#xe046;", "&#xe047;"]], // RightAssociation
    "\uf603": [["&#xe060;"], ["&#xe062;"], ["&#xe064;"], ["&#xe066;"], ["&#xe068;", "&#xe069;", "&#xe06a;", "&#xe002;"]], // LeftBracketingBar
    "\uf604": [["&#xe061;"], ["&#xe063;"], ["&#xe065;"], ["&#xe067;"], ["&#xe06b;", "&#xe06c;", "&#xe06d;", "&#xe002;"]], // RightBracketingBar
    "\uf605": [["&#xe070;"], ["&#xe072;"], ["&#xe074;"], ["&#xe076;"], ["&#xe078;", "&#xe079;", "&#xe07a;", "&#xe005;"]], // LeftDoubleBracketingBar
    "\uf606": [["&#xe071;"], ["&#xe073;"], ["&#xe075;"], ["&#xe077;"], ["&#xe07b;", "&#xe07c;", "&#xe07d;", "&#xe005;"]], // RightDoubleBracketingBar
    "\uf3d3": [["&#xe048;"], ["&#xe049;"], ["&#xe04a;", "&#xe04b;", "&#xe005;"]], // Conditioned
    "\uf432": [["&#xe04c;"], ["&#xe04d;"], ["&#xe04e;", "&#xe04f;", "&#xe002;"]], // VerticalSeparator
    "\uf361": [["&#xe050;"], ["&#xe052;"], ["&#xe054;"], ["&#xe056;"], ["&#xe058;", "&#xe059;", "&#xe05a;", "&#xe002;"]], // Piecewise
};

const handleBracket = (elem: HTMLElement, style: Style, span: number[]) => {
    let ch = elem.getAttribute("ch");
    const em = Math.floor(style.fontSize);
    if (ch === null) {
        // the bracket has never been rendered
        ch = elem.innerHTML;
        elem.setAttribute("ch", ch);
        elem.style.lineHeight = `${em}px`;
    }
    const previousHeightCat = parseInt(elem.getAttribute("height") || "-1");
    const middle = (style.fontMetric.baseline - 0.5) * style.fontSize;
    const spanMax = Math.max(span[0] - middle - 0.05 * em, span[1] + middle - 0.05 * em);
    const bracketMaxHeight = "()\u2308\u2309\u230a\u230b\uf603\uf604\uf605\uf606\uf361".includes(ch) ? 100 * em : 2 * em;
    const containerApproxHeight = Math.min(2 * Math.max(0.45 * em, spanMax), bracketMaxHeight);
    const bracketHeightCat = Math.max(Math.round(((containerApproxHeight / em) + 0.1) * 2) - 2, 0);
    const containerHeight = (1.0 + 0.5 * bracketHeightCat) * em;

    if (previousHeightCat !== bracketHeightCat) {
        const schemeSet = (bracketRenderScheme[ch] ?? []);
        const scheme = bracketHeightCat < schemeSet.length ?
            schemeSet[bracketHeightCat] : schemeSet[schemeSet.length - 1];
        registerBoxMutation(() => {
            if (scheme?.length === 1) {
                elem.innerHTML = `<w><div>${scheme[0]}</div></w>`;
            } else if (scheme?.length === 2) {
                const transform = `transform:scaleY(${0.25 * bracketHeightCat + 0.5});`;
                elem.innerHTML = `<w><div style="${transform}transform-origin:50% 100%">${scheme[0]}</div><div style="${transform}transform-origin:50% 0%">${scheme[1]}</div></w>`;
            } else if (scheme?.length === 3) {
                const spacing = 0.5 * bracketHeightCat - 1;
                const spacingElement = `<w style="height:${spacing}em;">${("<w>" + scheme[2] + "</w>").repeat(Math.ceil(spacing))}</w>`;
                elem.innerHTML = `<w><w>${scheme[0]}</w>${spacingElement}<w>${scheme[1]}</w></w>`;
            } else if (scheme?.length === 4) {
                const spacing = 0.5 * (0.5 * bracketHeightCat - 2);
                const spacingElement = `<w style="height:${spacing}em;">${("<w>" + scheme[3] + "</w>").repeat(Math.ceil(spacing))}</w>`;
                elem.innerHTML = `<w><w>${scheme[0]}</w>${spacingElement}<w>${scheme[1]}</w>${spacingElement}<w>${scheme[2]}</w></w>`;
            }

            elem.style.height = `${(containerHeight).toFixed(2)}px`;
            elem.setAttribute("height", String(bracketHeightCat));
        });
    }
    return [0.5 * containerHeight + middle, 0.5 * containerHeight - middle];
};

const handleStringBox = (elem: HTMLElement | null, style: Style) => {
    const lineHeight = style.lineHeight + (!(elem) ? 0.0 :
        elem.classList.contains("large-symbol") ? 0.5 :
            elem.classList.contains("small-symbol") ? -0.5 : 0.0
    );
    const padding = 0.5 * (lineHeight - 1.0) * style.fontSize;
    return [
        style.fontSize * style.fontMetric.baseline + padding,
        style.fontSize * (1.0 - style.fontMetric.baseline) + padding
    ];
};

const handleRowBox = (elem: HTMLElement, style: Style, styleHandled = false): number[] => {
    if (!styleHandled && (elem.style.fontFamily || elem.style.fontSize)) {
        let newFontFamily = elem.style.fontFamily || style.fontFamily;
        let newFontSize = parseCssLength(elem.style.fontSize);
        if (!(newFontSize >= 0)) {
            newFontSize = style.fontSize;
        }
        return handleRowBox(elem, {
            fontFamily: newFontFamily,
            fontSize: newFontSize,
            lineHeight: style.lineHeight,
            fontMetric: (newFontFamily === style.fontFamily) ? style.fontMetric :
                FontMeasure.getFontMetric(newFontFamily)
        }, true);
    } else {
        let span = handleStringBox(elem.children[0] as HTMLElement, style);
        let brackets = [];
        for (const child of elem.children as any) {
            if (child.tagName === "W") {
            } else if (child.tagName === "WB") {
                brackets.push(child);
            } else {
                const childSpan = handleBox(child, style);
                span = elementSpanMerge(span, childSpan);
            }
        }
        if (brackets.length > 0) {
            let bracketSpan = [-Infinity, -Infinity];
            for (const bracket of brackets) {
                bracketSpan = elementSpanMerge(bracketSpan, handleBracket(bracket, style, span));
            }
            span = elementSpanMerge(span, bracketSpan);
        }
        elem.setAttribute("span", elementSpanToString(span));
        return span;
    }
};

const getScriptStyle = (style: Style) => {
    return {
        ...style,
        fontSize: Math.max(style.fontSize * 0.71, MINIMUM_FONT_SIZE_PX)
    };
};
const getLineWidth = (style: Style) => Math.max(0.08 * style.fontSize, 1.0);

const getAlignments = (span: number[], style: Style) => {
    const supFactor = 0.37;
    const subFactor = 1.05;
    const fontSize = style.fontSize;
    const topFactor = -0.5 * (style.lineHeight - 1.0);
    const bottomFactor = 1.0 - topFactor;
    const baselineFactor = style.fontMetric.baseline;
    const middleFactor = style.fontMetric.middle;
    return {
        sup: span[0] + (topFactor - supFactor) * fontSize,
        sub: -span[1] + (bottomFactor - subFactor) * fontSize,
        middle: (baselineFactor - middleFactor) * fontSize,
        x: (2.0 * (baselineFactor - middleFactor)) * fontSize,
        ascend: (baselineFactor - 0.0) * fontSize,
        descend: (baselineFactor - 1.0) * fontSize,
        top: span[0] + (topFactor - 0.0) * fontSize,
        bottom: -span[1] + (bottomFactor - 1.0) * fontSize,
    };
};

const handleSubscriptBoxImpl = (elem: HTMLElement, style: Style, isSubscript: boolean) => {
    const base = elem.children[1] as HTMLElement;
    const script = elem.children[2] as HTMLElement;
    const scriptStyle = getScriptStyle(style);
    const baseSpan = handleBox(base, style);
    const scriptSpan = handleBox(script.firstChild as HTMLElement, scriptStyle);
    const baseAlign = getAlignments(baseSpan, style);
    const scriptAlign = getAlignments(scriptSpan, scriptStyle);
    const valign = isSubscript ?
        Math.min(baseAlign.sub, baseAlign.ascend - scriptAlign.top) :
        Math.max(baseAlign.sup, baseAlign.descend - scriptAlign.bottom);
    registerBoxMutation(() => {
        script.style.verticalAlign = `${valign}px`;
    });
    const span = elementSpanMerge(baseSpan, elementSpanAdd(scriptSpan, valign));
    elem.setAttribute("span", elementSpanToString(span));
    return span;
};
const handleSuperscriptBox = (elem: HTMLElement, style: Style) => handleSubscriptBoxImpl(elem, style, false);
const handleSubscriptBox = (elem: HTMLElement, style: Style) => handleSubscriptBoxImpl(elem, style, true);

const handleSubsuperscriptBox = (elem: HTMLElement, style: Style) => {
    const base = elem.children[1] as HTMLElement;
    const scripts = elem.children[2] as HTMLElement;
    const sup = scripts.children[0] as HTMLElement;
    const space = scripts.children[1] as HTMLElement;
    const sub = scripts.children[2] as HTMLElement;
    const scriptStyle = getScriptStyle(style);
    const baseSpan = handleBox(base, style);
    const subSpan = handleBox(sub, scriptStyle);
    const supSpan = handleBox(sup, scriptStyle);
    const baseAlign = getAlignments(baseSpan, style);

    const subValign = Math.min(baseAlign.sub, baseAlign.middle - subSpan[0]);
    const supValign = Math.max(baseAlign.sup, baseAlign.middle + supSpan[1]);

    const spaceHeight = Math.max(0.0, (supValign - supSpan[1]) - (subValign + subSpan[0]));
    const valign = subValign - subSpan[1];
    registerBoxMutation(() => {
        space.style.height = `${spaceHeight}px`;
        scripts.style.verticalAlign = `${valign}px`;
    });
    return [Math.max(baseSpan[0], supSpan[0] + supValign), Math.max(baseSpan[1], subSpan[1] - subValign)];
};

const handleUnderscriptBoxImpl = (elem: HTMLElement, style: Style, isUnderscript: boolean) => {
    const base = elem.children[isUnderscript ? 0 : 1] as HTMLElement;
    const script = elem.children[isUnderscript ? 1 : 0] as HTMLElement;
    const scriptStyle = getScriptStyle(style);
    const baseSpan = handleBox(base, style);
    const scriptSpan = handleBox(script.firstChild as HTMLElement, scriptStyle);
    const span = isUnderscript ?
        [baseSpan[0], baseSpan[1] + scriptSpan[0] + scriptSpan[1]] :
        [baseSpan[0] + scriptSpan[0] + scriptSpan[1], baseSpan[1]];
    elem.setAttribute("span", elementSpanToString(span));
    return span;
};
const handleOverscriptBox = (elem: HTMLElement, style: Style) => handleUnderscriptBoxImpl(elem, style, false);
const handleUnderscriptBox = (elem: HTMLElement, style: Style) => handleUnderscriptBoxImpl(elem, style, true);

const handleUnderoverscriptBox = (elem: HTMLElement, style: Style) => {
    const base = elem.children[1].firstChild as HTMLElement;
    const over = elem.children[0] as HTMLElement;
    const under = elem.children[1].children[1] as HTMLElement;
    const scriptStyle = getScriptStyle(style);
    const baseSpan = handleBox(base, style);
    const overSpan = handleBox(over.firstChild as HTMLElement, scriptStyle);
    const underSpan = handleBox(under.firstChild as HTMLElement, scriptStyle);
    const span = [baseSpan[0] + overSpan[0] + overSpan[1], baseSpan[1] + underSpan[0] + underSpan[1]];
    elem.setAttribute("span", elementSpanToString(span));
    return span;
};


const sqrtSignRenderScheme = [
    ["&#xe080;", "&#xe085;"],
    ["&#xe081;", "&#xe086;"],
    ["&#xe082;", "&#xe087;"],
    ["&#xe083;", "&#xe088;"],
    ["&#xe084;", "&#xe089;"]
];

const handleSqrtBox = (elem: HTMLElement, style: Style) => {
    const base = elem.children[2] as HTMLElement;
    const script = elem.children[0].children[1] as HTMLElement;
    const scriptStyle = getScriptStyle(style);
    const lineWidth = getLineWidth(style);
    const baseSpan = elementSpanMerge(handleStringBox(null, style), handleBox(base.firstChild as HTMLElement, style));
    const scriptSpan = script ? handleBox(script.firstChild as HTMLElement, scriptStyle) : [0.0, 0.0];
    const signRightHeight = (baseSpan[0] + baseSpan[1] + lineWidth) / style.fontSize;
    const signLeftHeight = Math.min(0.25 * (signRightHeight + 1.0), 1.0);
    const heightCat = Math.min(Math.max(Math.round(2.0 * (signRightHeight - 1.0)), 0), 4);
    const [signLeftChar, signRightChar] = sqrtSignRenderScheme[heightCat];
    const scaleFactorRight = (signRightHeight / (0.5 * heightCat + 1.0)).toFixed(3);
    const scaleFactorLeft = (signLeftHeight / (0.125 * heightCat + 0.5)).toFixed(3);
    const scriptExtraHeight = (signLeftHeight + 0.2 - signRightHeight) + (scriptSpan[0] + scriptSpan[1]) / style.fontSize;
    registerBoxMutation(() => {
        elem.children[1].innerHTML = `<w style="transform:scaleY(${scaleFactorRight})">${signRightChar}</w>`;
        elem.children[0].children[0].innerHTML = `<w style="transform:scaleY(${scaleFactorLeft})">${signLeftChar}</w>`;
        (elem.children[0].children[0] as HTMLElement).style.height = `${signLeftHeight.toFixed(3)}em`;
        elem.style.marginTop = `${Math.max(scriptExtraHeight, 0.1).toFixed(3)}em`;
    });
    return [baseSpan[0] + lineWidth, baseSpan[1]];
};
const handleFractionBox = (elem: HTMLElement, style: Style) => {
    const up = elem.children[0];
    const down = elem.children[1].children[1];
    const scriptStyle = elem.classList.contains("script") ? getScriptStyle(style) : style;
    const upSpan = handleBox(up.firstChild as HTMLElement, scriptStyle);
    const downSpan = handleBox(down.firstChild as HTMLElement, scriptStyle);
    const lineWidth = getLineWidth(style);
    const offset = getAlignments([0., 0.], style).middle;
    const span = elementSpanAdd([upSpan[0] + upSpan[1] + 0.5 * lineWidth, downSpan[0] + downSpan[1] + 0.5 * lineWidth], offset);
    elem.setAttribute("span", elementSpanToString(span));
    return span;
};
const handleGridBox = (elem: HTMLElement, style: Style) => {
    const childrenSpans = Array.from(elem.children).map(child => handleBox(child.firstChild as HTMLElement, style));
    clearBoxMutations();
    const height = elem.offsetHeight;
    const middle = (style.fontMetric.baseline - style.fontMetric.middle) * style.fontSize;
    const margin = 0.1 * style.fontSize;
    const span = [0.5 * height + middle + margin, 0.5 * height - middle + margin];
    elem.setAttribute("span", elementSpanToString(span));
    return span;
};
const handleFrameBox = (elem: HTMLElement, style: Style) => {
    const defaultPadding = getLineWidth(style);
    const orDefault = (value: number) => (value >= 0 ? value : defaultPadding);
    const paddings = [orDefault(parseCssLength(elem.style.paddingTop)), orDefault(parseCssLength(elem.style.paddingBottom))];
    const margins = [parseCssLength(elem.style.marginTop) || 0, parseCssLength(elem.style.marginBottom) || 0];
    const lineWidth = Math.max(1.0, 0.05 * style.fontSize);
    const contentSpan = handleBox(elem.firstChild as HTMLElement, style);
    const span = [contentSpan[0] + paddings[0] + margins[0] + lineWidth, contentSpan[1] + paddings[1] + margins[1] + lineWidth];
    elem.setAttribute("span", elementSpanToString(span));
    return span;
};
const handlePaneBox = (elem: HTMLElement, style: Style) => {
    const child = elem.children[0] as HTMLElement;
    return handleBox(child, style);
};
const handleGraphicsBox = (elem: HTMLElement, style: Style) => {
    const height = elem.offsetHeight;
    const middle = (style.fontMetric.baseline - style.fontMetric.middle) * style.fontSize;
    const margin = 0.1 * style.fontSize + 1.0;
    const span = [0.5 * height + middle + margin, 0.5 * height - middle + margin];
    elem.setAttribute("span", elementSpanToString(span));
    return span;
};

const handleGraphics3DBox = (elem: HTMLElement, style: Style) => {
    // if elem does not have attribute "rendered" or it is not equal to "true", render the scene
    if (elem.getAttribute("rendered") !== "true") {
        elem.setAttribute("rendered", "true");
        renderGraphics3D(elem);
    }

    const height = elem.offsetHeight;
    const middle = (style.fontMetric.baseline - style.fontMetric.middle) * style.fontSize;
    const margin = 0.1 * style.fontSize + 1.0;
    const span = [0.5 * height + middle + margin, 0.5 * height - middle + margin];
    elem.setAttribute("span", elementSpanToString(span));
    return span;
};
