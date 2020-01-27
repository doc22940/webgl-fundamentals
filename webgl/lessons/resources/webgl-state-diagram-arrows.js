/* eslint strict: "off" */
/* eslint no-undef: "error" */

function getPageRelativeRect(elem) {
  const rect = elem.getBoundingClientRect();
  const left = rect.left + window.scrollX | 0;
  const top = rect.top + window.scrollY | 0;
  const width = rect.width | 0;
  const height = rect.height | 0;
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
}

/*
function getElemRelativePosition(elem, x, y) {
  const rect = getPageRelativeRect(elem);
  return {
    x: (x >= 0 ? rect.right + x : rect.left + x) | 0,
    y: (y >= 0 ? rect.bottom + y : rect.top + y) | 0,
  };
}
*/

function addSVG(tag, parent, attrs = {}) {
  const elem = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) {
    elem.setAttribute(key, value);
  }
  parent.appendChild(elem);
  return elem;
}

/*
const svg = addSVG('svg', document.body, {
  width: '100%',
  height: '100%',
  viewBox: '0 0 640 480',
  version: '1.1',
  xmlns: "http://www.w3.org/2000/svg",
  style: styleToText({
    'font-family': 'monospace',
  }),
});


function attrsPlusClass(attrs, className) {
  if (className) {
    attrs['class'] = className;
  }
  return attrs;
}


function addText(parent, str, x, y, className, style) {
  const attrs = attrsPlusClass({
    x,
    y,
    ...style && {style},
  }, className);
  const text = addSVG('text', parent, attrs);
  text.textContent = str;
  return text;
}

function addRect(parent, x, y, width, height, style, className) {
  const attrs = attrsPlusClass({
    x,
    y,
    width,
    height,
    ...style && {style},
  }, className);
  return addSVG('rect', parent, attrs);
}

function addGroup(parent, transform) {
  transform = transform || ms.current();
  return addSVG('g', parent, {transform})
}
*/

function addArrow(parent) {
  const group = addSVG('g', parent, {
    fill: 'none',
    stroke: 'red',
    'stroke-width': '2',
    'marker-end': 'url(#arrowhead)',
  });
  return {
    group,
    path: addSVG('path', group),
  };
}

const p = ({x, y}) => `${x},${y}`;

const arrowCPOff = 50;
const arrowStartOff = 1;
const arrowEndOff = 15;

function updateArrow(arrowPath, divA, divB) {
  const a = getPageRelativeRect(divA);
  const b = getPageRelativeRect(divB);
  const posA = {
    x: a.right + arrowStartOff,
    y: a.top + a.height / 2,
  };
  const posACP = {
    x: posA.x + arrowCPOff,
    y: posA.y,
  };
  const posB = {
    x: b.left - arrowEndOff,
    y: b.top  + b.height / 2,
  };
  const posBCP = {
    x: posB.x - arrowCPOff,
    y: posB.y,
  };
  const path = `M${p(posA)} C${p(posACP)} ${p(posBCP)} ${p(posB)}`;
  arrowPath.setAttribute("d", path);
}

export default class ArrowManager {
  constructor(svg) {
    this.svg = svg;
    this.arrows = [];
  }
  add(divA, divB) {
    const arrow = addArrow(this.svg);
    const info = {
      arrow,
      divA,
      divB,
    };
    this.arrows.push(info);
    updateArrow(arrow.path, divA, divB);
    return info;
  }
  remove(info) {
    const ndx = this.arrows.indexOf(info);
    if (ndx >= 0) {
      this.arrows.splice(ndx, 1);
      const group = info.arrow.group;
      group.parentElement.removeChild(group);
    }
  }
  update() {
    for (const info of this.arrows) {
      updateArrow(info.arrow.path, info.divA, info.divB);
    }
  }
}

