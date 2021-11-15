
let fontMetricCache = {};

export const getFontMetric = font => {
  if (fontMetricCache[font] === undefined) {
    let body = document.querySelector("body");
    let canvas = document.createElement("div");
    canvas.className = "font-measure-canvas";
    canvas.style = `font-size:512px;font-family:${font};`;
    
    canvas.innerHTML = `<div>x</div><div style="vertical-align:middle;">x</div><div style="font-size:50%;">x</div>`;
    body.appendChild(canvas);
    const boxes = Array.from(canvas.children).map(e => e.getBoundingClientRect());
  
    const height = boxes[0].height;
    const middle = (boxes[1].top - boxes[0].top + 0.5 * boxes[1].height) / height;
    const baseline = ((boxes[2].top - boxes[0].top) / (1.0 - (boxes[2].height / boxes[0].height))) / height;
  
    fontMetricCache[font] = {middle, baseline};
  }
  return fontMetricCache[font];
};
