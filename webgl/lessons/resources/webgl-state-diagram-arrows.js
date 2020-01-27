/* eslint strict: "off" */
/* eslint no-undef: "error" */

import {addSVG} from './webgl-state-diagram-utils.js';

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

function addArrow(parent, color, arrowheadId, markerSide) {
  const marker = parent.querySelector(`#${arrowheadId}`);
  if (!marker) {
    const defs = parent.querySelector('defs');
    const marker = addSVG('marker', defs, {
      id: arrowheadId,
      viewBox: '0 0 10 10',
      refX: 6,
      refY: 5,
      markerWidth: 6,
      markerHeight: 6,
      orient: 'auto',
      fill: color,
    });
    addSVG('circle', marker, {
      cx: 5,
      cy: 5,
      r: 5,
    });
  }

  const attrs = {
    fill: 'none',
    stroke: color,
    'stroke-width': '2',
  };
  attrs[markerSide] = `url(#${arrowheadId})`;
  const group = addSVG('g', parent, attrs);

  return {
    group,
    path: addSVG('path', group),
  };
}

const p = ({x, y}) => `${x},${y}`;

const arrowCPOff = 100;
const arrowStartOff = 1;
const arrowEndOff = 15;

function updateArrow(arrowPath, startSegmentPath, divA, divB) {
  const a = getPageRelativeRect(divA);
  const b = getPageRelativeRect(divB);
  let aContainer = divA;
  while (!aContainer.classList.contains('window-content')) {
    aContainer = aContainer.parentElement;
  }
  const c = getPageRelativeRect(aContainer);

  // +--------+
  // |+---+   |
  // ||   A   C  cCP
  // |+---+   |         +----+
  // +--------+     bCP B    |
  //                    |    |
  //                    +----+

  const posA = {
    x: a.right,
    y: a.top + a.height / 2,
  };
  const posB = {
    x: b.left - arrowEndOff,
    y: b.top  + b.height / 2,
  };
  const posC = {
    x: c.right + arrowStartOff,
    y: posA.y,
  };
  const posCCP = {
    x: posC.x + arrowCPOff,
    y: posC.y,
  };
  const posBCP = {
    x: posB.x - arrowCPOff,
    y: posB.y,
  };
  const posARel = {
    x: posA.x - c.left,
    y: posA.y - c.top,
  };
  const posCRel = {
    x: posC.x - c.left,
    y: posC.y - c.top,
  };
  startSegmentPath.setAttribute("d", `M${p(posARel)} L${p(posCRel)}`);
  arrowPath.setAttribute("d", `M${p(posC)} C${p(posCCP)} ${p(posBCP)} ${p(posB)}`);
}

/*

        <marker id="arrowhead" viewBox="0 0 10 10" refX="3" refY="5"
            markerWidth="6" markerHeight="6" orient="auto" fill="red">
          <path d="M 0 0 L 10 5 L 0 10 z" />
        </marker>
*/

export default class ArrowManager {
  constructor(svg) {
    this.svg = svg;
    this.arrows = [];
    this.arrowHeadIdsByColor = {};
  }
  _getArrowhead(color) {
    const arrowId = this.arrowHeadIdsByColor[color];
    if (arrowId) {
      return arrowId;
    }
    const defs = this.svg.querySelector('defs');
    const id = color.replace(/[^a-z0-9]/g, '-');
    const marker = addSVG('marker', defs, {
      id,
      viewBox: '0 0 10 10',
      refX: 3,
      refY: 5,
      markerWidth: 6,
      markerHeight: 6,
      orient: 'auto',
      fill: color,
    });
    addSVG('path', marker, {
      d: 'M 0 0 L 10 5 L 0 10 z',
    });
    this.arrowHeadIdsByColor[color] = id;
    return id;
  }
  add(divA, divB, color = 'red') {
    const arrowheadId = this._getArrowhead(color);
    const arrow = addArrow(this.svg, color, arrowheadId, 'marker-end');
    let win = divA;
    while (!win.classList.contains('window-content')) {
      win = win.parentElement;
    }
    let startSegmentSVG = win.querySelector('.draggable-svg');
    if (!startSegmentSVG) {
      startSegmentSVG = addSVG('svg', win, {'class': 'draggable-svg'});
      addSVG('defs', startSegmentSVG);
    }

    const startSegment = addArrow(startSegmentSVG, color, `${arrowheadId}-s`, 'marker-start');
    const info = {
      arrow,
      startSegment,
      divA,
      divB,
    };
    this.arrows.push(info);
    updateArrow(arrow.path, startSegment.path, divA, divB);
    return info;
  }
  remove(info) {
    const ndx = this.arrows.indexOf(info);
    if (ndx >= 0) {
      this.arrows.splice(ndx, 1);
      const group = info.arrow.group;
      group.parentElement.removeChild(group);
      const segGroup = info.startSegment.group;
      segGroup.parentElement.removeChild(segGroup);
    }
  }
  update() {
    const remove = this.arrows.filter(info => !document.body.contains(info.divB));
    for (const r of remove) {
      this.remove(r);
    }
    for (const info of this.arrows) {
      updateArrow(info.arrow.path, info.startSegment.path, info.divA, info.divB);
    }
  }
}

