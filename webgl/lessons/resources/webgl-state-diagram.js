/* eslint strict: "off" */
//'use strict';

// TODO:
// * connect arrows
// * position things
// * texture mips
// * fix attrib css


hljs.initHighlightingOnLoad();

var gl = document.querySelector('canvas').getContext('webgl');
twgl.addExtensionsToContext(gl);

const webglObjects = new Map();

const px = (v) => `${v}px`;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const formatG = v => typeof v === 'number' ? v.toFixed(3).replace(/\.?0+$/, '') : v;
function formatX(v, n = 0) {
  const s = v.toString(16);
  return `0x${s.padStart(n, '0').substr(0, 2)}`;
}
const formatX2 = v => formatX(v, 2);
const formatEnum = v => glEnumToString(gl, v);
const formatEnumZero = v => v ? v === 1 ? 'ONE' : glEnumToString(gl, v) : 'ZERO';
const formatBoolean = v => v.toString();
const formatWebGLObject = v => v ? webglObjects.get(v).name : 'null';
const formatWebGLObjectOrDefaultVAO = v => v ? webglObjects.get(v).name : 'null (default VAO)';

function flash(elem) {
  elem.classList.remove('flash');
  setTimeout(() => {
    elem.classList.add('flash');
  }, 1);
}

function updateElem(elem, newValue) {
  if (elem.textContent !== newValue) {
    elem.textContent = newValue;
    flash(elem);
  }
}

function helpToMarkdown(s) {
  s = s.replace(/---/g, '```')
       .replace(/--/g, '`');
  const m = /^\n( +)/.exec(s);
  if (!m) {
    return s;
  }
  const lines = s.split('\n');
  if (lines[0].trim() === '') {
    lines.shift();
  }
  if (lines[lines.length - 1].trim() === '') {
    lines.pop();
  }
  const indent = m[1];
  return lines.map(line => line.startsWith(indent) ? line.substr(indent.length) : line).join('\n');
}

const converter = new showdown.Converter();
const hintElem = document.querySelector('#hint');
let lastWidth;
let lastHint;
function setHint(e, hint = '') {
  if (lastHint !== hint) {
    lastHint = hint;
    const html = converter.makeHtml(hint);
    hintElem.innerHTML = html;
    hintElem.querySelectorAll('pre>code').forEach(elem => hljs.highlightBlock(elem));
    lastWidth = hintElem.clientWidth;
  }
  hintElem.style.left = px(e.pageX + lastWidth > window.innerWidth ? window.innerWidth - lastWidth : e.pageX + 5);
  hintElem.style.top = px(e.pageY + 5);
  hintElem.style.display = hint ? '' : 'none';
}

document.body.addEventListener('mousemove', function(e) {
  let elem = e.target;
  while (!elem.dataset.help && elem.nodeName !== 'BODY') {
      elem = elem.parentElement;
  }
  setHint(e, elem.dataset.help);
});

const webglFuncs = `
--gl.NEVER--,
--gl.LESS--,
--gl.EQUAL--,
--gl.LEQUAL--,
--gl.GREATER--,
--gl.NOTEQUAL--,
--gl.GEQUAL--,
--gl.ALWAYS--
`;

const depthState = [
  {
    pname: 'DEPTH_TEST',
    setter: ['enable', 'disable'],
    formatter: formatUniformValue,
    help: `
      to enable

      ---js
      gl.enable(gl.DEPTH_TEST);
      ---

      to disable

      ---js
      gl.disable(gl.DEPTH_TEST);
      ---
    `,
  },
  {
    pname: 'DEPTH_FUNC',
    setter: 'depthFunc',
    formatter: formatEnum,
    help: `
      ---js
      gl.depthFunc(func);
      ---

      sets the function used for the depth test where func is one of
      ${webglFuncs}.
    `,
  },
  {
    pname: 'DEPTH_RANGE',
    setter: 'depthRange',
    formatter: formatUniformValue,
    help: `
      specifies how to convert from clip space to a depth value

      ---js
      gl.depthRange(zNear, zFar);
      ---
    `,
  },
  {
    pname: 'DEPTH_WRITEMASK',
    setter: 'depthMask',
    formatter: formatBoolean,
    help: `
      sets whether or not to write to the depth buffer

      ---js
      gl.depthMask(trueFalse);
      ---
    `,
  },
];

function addElem(tag, parent, attrs = {}) {
  const elem = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        try {
        elem[key][k] = v;
        } catch (e) {
          debugger;  // eslint-disable-line no-debugger
        }
      }
    } else if (elem[key] === undefined) {
      elem.setAttribute(key, value);
    } else {
      elem[key] = value;
    }
  }
  parent.appendChild(elem);
  return elem;
}

let dragTarget;
let dragMouseStartX;
let dragMouseStartY;
let dragTargetStartX;
let dragTargetStartY;

function toggleExpander(e) {
  e.preventDefault();
  e.stopPropagation();
  e.target.parentElement.classList.toggle('open');
}

function dragStart(e) {
  e.preventDefault();
  e.stopPropagation();
  dragTarget = this;
  const rect = this.getBoundingClientRect();
  dragMouseStartX = e.pageX;
  dragMouseStartY = e.pageY;
  dragTargetStartX = (window.scrollX + rect.left) | 0; // parseInt(this.style.left || '0');
  dragTargetStartY = (window.scrollY + rect.top) | 0;  // parseInt(this.style.top || '0');

  window.addEventListener('mousemove', dragMove, {passive: false});
  window.addEventListener('mouseup', dragStop, {passive: false});

  const elements = [];
  document.querySelectorAll('.draggable').forEach(elem => {
    if (elem !== this) {
      elements.push(elem);
    }
  });
  elements.sort((a, b) => a.style.zIndex > b.style.zIndex);
  elements.push(this);
  elements.forEach((elem, ndx) => {
    elem.style.zIndex = ndx + 1;
  });
}

function dragMove(e) {
  if (dragTarget) {
    e.preventDefault();
    e.stopPropagation();
    const x = dragTargetStartX + (e.pageX - dragMouseStartX);
    const y = dragTargetStartY + (e.pageY - dragMouseStartY);
    dragTarget.style.left = px(x);
    dragTarget.style.top = px(y);
    //drawConnector();
  }
}

function dragStop(e) {
  e.preventDefault();
  e.stopPropagation();
  dragTarget = undefined;
  window.removeEventListener('mousemove', dragMove);
  window.removeEventListener('mouseup', dragStop);
}

function setRelativePosition(elem, base, x, y) {
  const elemRect = elem.getBoundingClientRect();
  const baseRect = base.getBoundingClientRect();
  elem.style.left = px(x >= 0 ? x : baseRect.right  + x - elemRect.width  | 0);
  elem.style.top  = px(y >= 0 ? y : baseRect.bottom + y - elemRect.height | 0);
}

function makeDraggable(elem, x = 0, y = 0) {
  const div = addElem('div', elem.parentElement, {
    className: 'draggable',
  });
  elem.parentElement.removeChild(elem);
  div.appendChild(elem);
  setRelativePosition(div, diagramElem, x, y);
  div.addEventListener('mousedown', dragStart, {passive: false});
}

function createExpander(parent, title, attrs = {}) {
  const outer = addElem('div', parent, Object.assign({className: 'expander'}, attrs));
  const titleElem = addElem('div', outer, {
    textContent: title,
  });
  titleElem.addEventListener('click', toggleExpander);
  titleElem.addEventListener('mousedown', (e) => e.stopPropagation());
  return outer;
}

function glEnumToString(gl, value) {
  const keys = [];
  for (const key in gl) {
    if (gl[key] === value) {
      keys.push(key);
    }
  }
  return keys.length ? keys.join(' | ') : `0x${value.toString(16)}`;
}

function createStateTable(states, parent, title, queryFn, update = true) {
  const expander = createExpander(parent, title);
  const table = addElem('table', expander);
  const tbody = addElem('tbody', table);
  for (const state of states) {
    const {pname, help} = state;
    const tr = addElem('tr', tbody);
    tr.dataset.help = helpToMarkdown(help);
    addElem('td', tr, {textContent: pname});
    addElem('td', tr);
  }
  if (update) {
    updateStateTable(states, expander, queryFn, true);
  }
  return expander;
}

function updateStateTable(states, parent, queryFn, initial) {
  const tbody = parent.querySelector('tbody');
  // NOTE: Assumption that states array is parallel to table rows
  states.forEach((state, rowNdx) => {
    const {formatter} = state;
    const value = formatter(queryFn(state));
    const row = tbody.rows[rowNdx];
    const isNew = row.cells[1].textContent !== value;
    row.cells[1].textContent = value;
    if (!initial && isNew) {
      flash(row);
    }
  });
}

function isBuiltIn(info) {
  const name = info.name;
  return name.startsWith("gl_") || name.startsWith("webgl_");
}

function createProgramAttributes(parent, gl, program) {
  const tbody = createTable(parent, ['name', 'location']);

  const scan = () => {
    tbody.innerHTML = '';
    flash(tbody);

    const numAttribs = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    for (let ii = 0; ii < numAttribs; ++ii) {
      const attribInfo = gl.getActiveAttrib(program, ii);
      if (isBuiltIn(attribInfo)) {
          continue;
      }
      const index = gl.getAttribLocation(program, attribInfo.name);
      const tr = addElem('tr', tbody);
      const help = helpToMarkdown(`
        get attribute location with

        ---js
        const loc = gl.getAttribLocation(program, '${attribInfo.name}');
        ---
        
        attribute locations are chosen by WebGL. You can choose locations
        by calling.

        ---js
        gl.bindAttribLocation(program, desiredLocation, '${attribInfo.name}');
        ---

        **BEFORE** calling
        
        ---js
        gl.linkProgram(program);
        ---
      `);
      addElem('td', tr, {textContent: attribInfo.name, dataset: {help}});
      addElem('td', tr, {textContent: index, dataset: {help}});
    }
  };

  scan();

  return {
    elem: tbody,
    scan,
  };
}

const getUniformInfo = (function() {

const FLOAT                         = 0x1406;
const FLOAT_VEC2                    = 0x8B50;
const FLOAT_VEC3                    = 0x8B51;
const FLOAT_VEC4                    = 0x8B52;
const INT                           = 0x1404;
const INT_VEC2                      = 0x8B53;
const INT_VEC3                      = 0x8B54;
const INT_VEC4                      = 0x8B55;
const BOOL                          = 0x8B56;
const BOOL_VEC2                     = 0x8B57;
const BOOL_VEC3                     = 0x8B58;
const BOOL_VEC4                     = 0x8B59;
const FLOAT_MAT2                    = 0x8B5A;
const FLOAT_MAT3                    = 0x8B5B;
const FLOAT_MAT4                    = 0x8B5C;
const SAMPLER_2D                    = 0x8B5E;
const SAMPLER_CUBE                  = 0x8B60;
const SAMPLER_3D                    = 0x8B5F;
const SAMPLER_2D_SHADOW             = 0x8B62;
const FLOAT_MAT2x3                  = 0x8B65;
const FLOAT_MAT2x4                  = 0x8B66;
const FLOAT_MAT3x2                  = 0x8B67;
const FLOAT_MAT3x4                  = 0x8B68;
const FLOAT_MAT4x2                  = 0x8B69;
const FLOAT_MAT4x3                  = 0x8B6A;
const SAMPLER_2D_ARRAY              = 0x8DC1;
const SAMPLER_2D_ARRAY_SHADOW       = 0x8DC4;
const SAMPLER_CUBE_SHADOW           = 0x8DC5;
const UNSIGNED_INT                  = 0x1405;
const UNSIGNED_INT_VEC2             = 0x8DC6;
const UNSIGNED_INT_VEC3             = 0x8DC7;
const UNSIGNED_INT_VEC4             = 0x8DC8;
const INT_SAMPLER_2D                = 0x8DCA;
const INT_SAMPLER_3D                = 0x8DCB;
const INT_SAMPLER_CUBE              = 0x8DCC;
const INT_SAMPLER_2D_ARRAY          = 0x8DCF;
const UNSIGNED_INT_SAMPLER_2D       = 0x8DD2;
const UNSIGNED_INT_SAMPLER_3D       = 0x8DD3;
const UNSIGNED_INT_SAMPLER_CUBE     = 0x8DD4;
const UNSIGNED_INT_SAMPLER_2D_ARRAY = 0x8DD7;

const TEXTURE_2D                    = 0x0DE1;
const TEXTURE_CUBE_MAP              = 0x8513;
const TEXTURE_3D                    = 0x806F;
const TEXTURE_2D_ARRAY              = 0x8C1A;

const typeMap = {};

/**
 * Returns the corresponding bind point for a given sampler type
 */
//function getBindPointForSamplerType(gl, type) {
//  return typeMap[type].bindPoint;
//}

// This kind of sucks! If you could compose functions as in `var fn = gl[name];`
// this code could be a lot smaller but that is sadly really slow (T_T)

const floatSetter = 'gl.uniform1f(location, value);';
const floatArraySetter = 'gl.uniform1fv(location, arrayOfValues);';
const floatVec2Setter = 'gl.uniform2fv(location, arrayOf2Values); // or\ngl.uniform2f(location, v0, v1);';
const floatVec3Setter = 'gl.uniform3fv(location, arrayOf3Values); // or\ngl.uniform3f(location, v0, v1, v2);';
const floatVec4Setter = 'gl.uniform4fv(location, arrayOf4Values); // or\ngl.uniform4f(location, v0, v1, v2, v3);';
const intSetter = 'gl.uniform1i(location, value);';
const intArraySetter = 'gl.uniform1iv(location, arrayOfValues);';
const intVec2Setter = 'gl.uniform2iv(location, arrayOf2Values); // or\ngl.uniform2i(location, v0, v1)';
const intVec3Setter = 'gl.uniform3iv(location, arrayOf3Values); // or\ngl.uniform3i(location, v0, v1, v2)';
const intVec4Setter = 'gl.uniform4iv(location, arrayOf4Values); // or\ngl.uniform4i(location, v0, v1, v2, v3)';
const uintSetter = 'gl.uniform1ui(location, value);';
const uintArraySetter = 'gl.uniform1uiv(location, arrayOf1Value);';
const uintVec2Setter = 'gl.uniform2uiv(location, arrayOf2Values); // or\ngl.uniform2ui(location, v0, v1)';
const uintVec3Setter = 'gl.uniform3uiv(location, arrayOf3Values); // or\ngl.uniform3ui(location, v0, v1, v2)';
const uintVec4Setter = 'gl.uniform4uiv(location, arrayOf4Values); // or\ngl.uniform4ui(location, v0, v1, v2, v3)';
const floatMat2Setter = 'gl.uniformMatrix2fv(location, false, arrayOf4Values);';
const floatMat3Setter = 'gl.uniformMatrix3fv(location, false, arrayOf9Values);';
const floatMat4Setter = 'gl.uniformMatrix4fv(location, false, arrayOf16Values);';
const floatMat23Setter = 'gl.uniformMatrix2x3fv(location, false, arrayOf6Values);';
const floatMat32Setter = 'gl.uniformMatrix3x2fv(location, false, arrayOf6values);';
const floatMat24Setter = 'gl.uniformMatrix2x4fv(location, false, arrayOf8Values);';
const floatMat42Setter = 'gl.uniformMatrix4x2fv(location, false, arrayOf8Values);';
const floatMat34Setter = 'gl.uniformMatrix3x4fv(location, false, arrayOf12Values);';
const floatMat43Setter = 'gl.uniformMatrix4x3fv(location, false, arrayOf12Values);';
const samplerSetter = 'gl.uniform1i(location, textureUnitIndex);\n// note: this only tells the shader\n// which texture unit to reference.\n// you still need to bind a texture\n// to that texture unit';
const samplerArraySetter = 'gl.uniform1iv(location, arrayOfTextureUnitIndices);';

typeMap[FLOAT]                         = { Type: Float32Array, size:  4, setter: floatSetter,      arraySetter: floatArraySetter, };
typeMap[FLOAT_VEC2]                    = { Type: Float32Array, size:  8, setter: floatVec2Setter,  };
typeMap[FLOAT_VEC3]                    = { Type: Float32Array, size: 12, setter: floatVec3Setter,  };
typeMap[FLOAT_VEC4]                    = { Type: Float32Array, size: 16, setter: floatVec4Setter,  };
typeMap[INT]                           = { Type: Int32Array,   size:  4, setter: intSetter,        arraySetter: intArraySetter, };
typeMap[INT_VEC2]                      = { Type: Int32Array,   size:  8, setter: intVec2Setter,    };
typeMap[INT_VEC3]                      = { Type: Int32Array,   size: 12, setter: intVec3Setter,    };
typeMap[INT_VEC4]                      = { Type: Int32Array,   size: 16, setter: intVec4Setter,    };
typeMap[UNSIGNED_INT]                  = { Type: Uint32Array,  size:  4, setter: uintSetter,       arraySetter: uintArraySetter, };
typeMap[UNSIGNED_INT_VEC2]             = { Type: Uint32Array,  size:  8, setter: uintVec2Setter,   };
typeMap[UNSIGNED_INT_VEC3]             = { Type: Uint32Array,  size: 12, setter: uintVec3Setter,   };
typeMap[UNSIGNED_INT_VEC4]             = { Type: Uint32Array,  size: 16, setter: uintVec4Setter,   };
typeMap[BOOL]                          = { Type: Uint32Array,  size:  4, setter: intSetter,        arraySetter: intArraySetter, };
typeMap[BOOL_VEC2]                     = { Type: Uint32Array,  size:  8, setter: intVec2Setter,    };
typeMap[BOOL_VEC3]                     = { Type: Uint32Array,  size: 12, setter: intVec3Setter,    };
typeMap[BOOL_VEC4]                     = { Type: Uint32Array,  size: 16, setter: intVec4Setter,    };
typeMap[FLOAT_MAT2]                    = { Type: Float32Array, size: 16, setter: floatMat2Setter,  };
typeMap[FLOAT_MAT3]                    = { Type: Float32Array, size: 36, setter: floatMat3Setter,  };
typeMap[FLOAT_MAT4]                    = { Type: Float32Array, size: 64, setter: floatMat4Setter,  };
typeMap[FLOAT_MAT2x3]                  = { Type: Float32Array, size: 24, setter: floatMat23Setter, };
typeMap[FLOAT_MAT2x4]                  = { Type: Float32Array, size: 32, setter: floatMat24Setter, };
typeMap[FLOAT_MAT3x2]                  = { Type: Float32Array, size: 24, setter: floatMat32Setter, };
typeMap[FLOAT_MAT3x4]                  = { Type: Float32Array, size: 48, setter: floatMat34Setter, };
typeMap[FLOAT_MAT4x2]                  = { Type: Float32Array, size: 32, setter: floatMat42Setter, };
typeMap[FLOAT_MAT4x3]                  = { Type: Float32Array, size: 48, setter: floatMat43Setter, };
typeMap[SAMPLER_2D]                    = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_2D,       };
typeMap[SAMPLER_CUBE]                  = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_CUBE_MAP, };
typeMap[SAMPLER_3D]                    = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_3D,       };
typeMap[SAMPLER_2D_SHADOW]             = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_2D,       };
typeMap[SAMPLER_2D_ARRAY]              = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_2D_ARRAY, };
typeMap[SAMPLER_2D_ARRAY_SHADOW]       = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_2D_ARRAY, };
typeMap[SAMPLER_CUBE_SHADOW]           = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_CUBE_MAP, };
typeMap[INT_SAMPLER_2D]                = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_2D,       };
typeMap[INT_SAMPLER_3D]                = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_3D,       };
typeMap[INT_SAMPLER_CUBE]              = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_CUBE_MAP, };
typeMap[INT_SAMPLER_2D_ARRAY]          = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_2D_ARRAY, };
typeMap[UNSIGNED_INT_SAMPLER_2D]       = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_2D,       };
typeMap[UNSIGNED_INT_SAMPLER_3D]       = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_3D,       };
typeMap[UNSIGNED_INT_SAMPLER_CUBE]     = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_CUBE_MAP, };
typeMap[UNSIGNED_INT_SAMPLER_2D_ARRAY] = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_2D_ARRAY, };

return function(type) {
  return typeMap[type];
};

}());

function createTable(parent, headings) {
  const table = addElem('table', parent);
  const thead = addElem('thead', table);
  headings.forEach(heading => addElem('th', thead, {textContent: heading}));
  return addElem('tbody', table);
}

function formatUniformValue(v) {
  if (v.buffer && v.buffer instanceof ArrayBuffer) {
    v = Array.from(v);
  }
  if (Array.isArray(v)) {
    if (v.length > 4) {
      // should really look at type of uniform
      const mod = v.length % 3 === 0 ? 3 : 4;
      const rows = [];
      for (let i = 0; i < v.length; i += mod) {
        const row = [];
        const end = Math.min(i + mod, v.length);
        for (let j = i; j < end; ++j) {
          row.push(formatG(v[j]));
        }
        rows.push(row.join(', '));
      }
      return rows.join(',\n');
    }
    return v.map(formatG).join(', ');
  }
  return typeof v === 'number' ? formatG(v) : v;
}

function createProgramUniforms(parent, gl, program) {
  const tbody = createTable(parent, ['name', 'value']);

  let locations = [];
  let numUniforms;

  const update = () => {
    locations.forEach((location, ndx) => {
      const cell = tbody.rows[ndx].cells[1];
      updateElem(cell, formatUniformValue(gl.getUniform(program, location)));
    });
  };

  const scan = () => {
    locations = [];
    numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    tbody.innerHTML = '';
    flash(tbody);

    for (let ii = 0; ii < numUniforms; ++ii) {
      const uniformInfo = gl.getActiveUniform(program, ii);
      if (isBuiltIn(uniformInfo)) {
          continue;
      }
      let name = uniformInfo.name;
      // remove the array suffix.
      if (name.substr(-3) === "[0]") {
        name = name.substr(0, name.length - 3);
      }
      locations.push(gl.getUniformLocation(program, name));
      const info = getUniformInfo(uniformInfo.type);
      const help = helpToMarkdown(`---js\nconst location = gl.getUniformLocation(\n    program,\n    '${name}');\ngl.useProgram(program); // set current program\n${info.setter}\n---`);

      const tr = addElem('tr', tbody);
      addElem('td', tr, {textContent: name, dataset: {help}});
      addElem('td', tr, {
        dataset: {help},
      });
    }
    update();
  };

  scan();
  update();

  return {
    elem: tbody,
    scan,
    update,
  }
}

function setName(elem, name) {
  const nameElem = elem.querySelector('.name');
  nameElem.textContent = `${nameElem.textContent}[${name}]`;
}

const shaderState = [
 {
    pname: 'COMPILE_STATUS',
    formatter: formatUniformValue,
    help: `
    Whether or not the last call to --gl.compileShader-- was successful.
    `,
  },
];

function createShaderDisplay(parent, name, shader) {
  const type = gl.getShaderParameter(shader, gl.SHADER_TYPE) === gl.VERTEX_SHADER ? 'vertex' : 'fragment';

  const shElem = createTemplate(parent, `#${type}-shader-template`);
  setName(shElem, name);

  const sourceExpander = createExpander(shElem, 'source');
  const preElem = addElem('pre', sourceExpander);

  const updateSource = () => {
    preElem.innerHTML = '';
    const codeElem = addElem('code', preElem, {className: 'lang-glsl'});
    codeElem.textContent = gl.getShaderSource(shader);
    hljs.highlightBlock(codeElem);
    expand(sourceExpander);
  };

  const queryFn = state => {
    const {pname} = state;
    const value = gl.getShaderParameter(shader, gl[pname]);
    return value;
  };

  const stateTable = createStateTable(shaderState, shElem, 'state', queryFn);
  expand(stateTable);
  makeDraggable(shElem);

  return {
    elem: shElem,
    updateSource,
    updateState: () => {
      updateStateTable(shaderState, stateTable, queryFn);
    },
  };
}

const programState = [
 {
    pname: 'LINK_STATUS',
    formatter: formatUniformValue,
    help: `
    Whether or not the last call to --gl.linkProgram-- was successful.
    `,
  },
];

function createProgramDisplay(parent, name, program) {
  const prgElem = createTemplate(parent, '#program-template');
  setName(prgElem, name);

  const shaderExpander = createExpander(prgElem, 'attached shaders');
  const shadersTbody = createTable(shaderExpander, []);

  let oldShaders = [];
  let newShaders;

  const updateAttachedShaders = () => {
    expand(shaderExpander);
    shadersTbody.innerHTML = '';

    newShaders = gl.getAttachedShaders(program);

    // sort so VERTEX_SHADER is first.
    newShaders.sort((a, b) => {
      const aType = gl.getShaderParameter(a, gl.SHADER_TYPE);
      const bType = gl.getShaderParameter(b, gl.SHADER_TYPE);
      return aType < bType;
    });

    for (const shader of newShaders) {
      const tr = addElem('tr', shadersTbody);
      addElem('td', tr, {
          className: oldShaders.indexOf(shader) >= 0 ? '' : 'flash',
          textContent: formatWebGLObject(shader),
      });
    }

    oldShaders = newShaders;
  };

  const attribExpander = createExpander(prgElem, 'attribute info', {
    dataset: {
      hint: 'attributes are user defined. Their values come from buffers as specified in a *vertex array*.',
    },
  });
  const uniformExpander = createExpander(prgElem, 'uniforms', {
    dataset: {
      hint: 'uniform values are user defined program state. The locations and values are different for each program.',
    },
  });


  expand(attribExpander);
  expand(uniformExpander);

  const attribUI = createProgramAttributes(attribExpander, gl, program);
  const uniformUI = createProgramUniforms(uniformExpander, gl, program);

  const queryFn = state => {
    const {pname} = state;
    const value = gl.getProgramParameter(program, gl[pname]);
    return value;
  };

  const stateTable = createStateTable(programState, prgElem, 'state', queryFn);
  expand(stateTable);

  makeDraggable(prgElem);

  return {
    elem: prgElem,
    updateAttachedShaders,
    updateState: () => {
      updateStateTable(programState, stateTable, queryFn);
    },
    scanAttributes: attribUI.scan,
    scanUniforms: uniformUI.scan,
    updateUniforms: uniformUI.update,
  };
}

function createTemplate(parent, selector) {
  const template = document.querySelector(selector);
  const collection = template.content.cloneNode(true);
  if (collection.children.length !== 1) {
    throw new Error('template must have 1 child');
  }
  const elem = collection.children[0];
  parent.appendChild(elem);
  return elem;
}

const maxAttribs = 8;
function createVertexArrayDisplay(parent, name, /* webglObject */) {
  const vaElem = createTemplate(parent, '#vertex-array-template');
  setName(vaElem, name);
  const vaoNote = helpToMarkdown(`
    note: the current vertex array can be set with the
    [--OES_vertex_array_object--](https://www.khronos.org/registry/webgl/extensions/OES_vertex_array_object/)
    extension. Otherwise there is only the 1 default vertex array in WebGL 1.0.
  `);
  const attrExpander = createExpander(vaElem.querySelector('.state-table'), 'attributes');
  expand(attrExpander);
  const table = createTemplate(attrExpander, '#vertex-attributes-template');
  const attrsElem = table.querySelector('tbody');

  for (let i = 0; i < maxAttribs; ++i) {
    const tr = addElem('tr', attrsElem);

    addElem('td', tr, {
      dataset: {
        help: helpToMarkdown(`
        * --true-- this attribute uses data from a buffer.
        * --false-- it uses --value--.

        ---js
        const index = gl.getAttribLocation(program, 'someAttrib'); // ${i}
        gl.enableVertexAttribArray(index);   // turn on
        gl.disableVertexAttribArray(index);  // turn off
        ---

        ${vaoNote}`),
      },
    });
    addElem('td', tr, {
      className: 'used-when-disabled',
      dataset: {
        help: helpToMarkdown(`
        The value used if this attribute is disabled.

        ---js
        const index = gl.getAttribLocation(program, 'someAttrib'); // ${i}
        gl.vertexAttrib4fv(index, [1, 2, 3, 4]);
        ---

        ${vaoNote}`),
      },
    });
    addElem('td', tr, {
      className: 'used-when-enabled',
      dataset: {
        help: helpToMarkdown(`
        Number of values to pull from buffer per vertex shader iteration

        ---js
        const index = gl.getAttribLocation(program, 'someAttrib'); // ${i}
        gl.vertexAttribPointer(index, SIZE, type, normalize, stride, offset);
        ---

        ${vaoNote}`),
      },
    });
    addElem('td', tr, {
      className: 'used-when-enabled',
      dataset: {
        help: helpToMarkdown(`
        The type of the data to read from the buffer. 
        --BYTE--, --UNSIGNED_BYTE--, --SHORT--, --UNSIGNED_SHORT--,
        --INT--, --UNSIGNED_INT--, --FLOAT--

        ---js
        const index = gl.getAttribLocation(program, 'someAttrib'); // ${i}
        gl.vertexAttribPointer(index, size, TYPE, normalize, stride, offset);
        ---

        ${vaoNote}`),
      },
    });
    addElem('td', tr, {
      className: 'used-when-enabled',
      dataset: {
        help: helpToMarkdown(`
        true = use the value as is
        false = convert the value to 0.0 to 1.0 for UNSIGNED types
        and -1.0 to 1.0 for signed types.

        ---js
        const index = gl.getAttribLocation(program, 'someAttrib'); // ${i}
        gl.vertexAttribPointer(index, size, type, NORMALIZE, stride, offset);
        ---

        ${vaoNote}`),
      },
    });
    addElem('td', tr, {
      className: 'used-when-enabled',
      dataset: {
        help: helpToMarkdown(`
        how many bytes to advance in the buffer per vertex shader iteration
        to get to the next value for this attribute. 0 is a special value
        that means WebGL will figure out the stride from the --type-- and
        --size-- arguments.
        
        ---js
        const index = gl.getAttribLocation(program, 'someAttrib'); // ${i}
        gl.vertexAttribPointer(index, size, type, normalize, STRIDE, offset);
        ---

        ${vaoNote}`),
      },
    });
    addElem('td', tr, {
      className: 'used-when-enabled',
      dataset: {
        help: helpToMarkdown(`
        The offset in bytes where the data for this attribute starts in the buffer.
        
        ---js
        const index = gl.getAttribLocation(program, 'someAttrib'); // ${i}
        gl.vertexAttribPointer(index, size, type, normalize, stride, OFFSET);
        ---

        ${vaoNote}`),
      },
    });
    addElem('td', tr, {
      className: 'used-when-enabled',
      dataset: {
        help: helpToMarkdown(`
        The buffer this attribute will pull data from. This gets set
        implicitly when calling --gl.vertexAttribPointer-- from the
        currently bound --ARRAY_BUFFER--
        
        ---js
        const index = gl.getAttribLocation(program, 'someAttrib'); // ${i}

        // bind someBuffer to ARRAY_BUFFER
        gl.bindBuffer(gl.ARRAY_BUFFER, someBuffer);

        // someBuffer will get bound to this attribute
        gl.vertexAttribPointer(index, size, type, normalize, stride, offset);
        ---

        ${vaoNote}`),
      },
    });
    addElem('td', tr, {
      className: 'used-when-enabled',
      dataset: {
        help: helpToMarkdown(`
        Used with the [ANGLE_instanced_arrays extension](https://www.khronos.org/registry/webgl/extensions/ANGLE_instanced_arrays/).
        If --divisor-- === 0 then this attribute advances normally, once each vertex shader iteration.
        If --divisor-- > 0 then this attribute advances once each --divisor-- instances.
        
        ---js
        const ext = gl.getExtension('ANGLE_instanced_arrays');
        const index = gl.getAttribLocation(program, 'someAttrib'); // ${i}
        ext.vertexAttribDivisor(index, divisor);
        ---

        ${vaoNote}`),
      },
    });
  }

  const formatters = [
    formatBoolean,      // enable
    formatUniformValue, // value
    formatUniformValue, // size
    formatEnum,         // type
    formatBoolean,      // normalize
    formatUniformValue, // stride
    formatUniformValue, // offset
    formatWebGLObject,  // buffer
    formatUniformValue, // divisor
  ];

  const updateAttributes = () => {
    for (let i = 0; i < maxAttribs; ++i) {
      const row = attrsElem.rows[i];
      const data = [
        gl.getVertexAttrib(i, gl.VERTEX_ATTRIB_ARRAY_ENABLED),
        gl.getVertexAttrib(i, gl.CURRENT_VERTEX_ATTRIB),
        gl.getVertexAttrib(i, gl.VERTEX_ATTRIB_ARRAY_SIZE),
        gl.getVertexAttrib(i, gl.VERTEX_ATTRIB_ARRAY_TYPE),
        gl.getVertexAttrib(i, gl.VERTEX_ATTRIB_ARRAY_NORMALIZED),
        gl.getVertexAttrib(i, gl.VERTEX_ATTRIB_ARRAY_STRIDE),
        gl.getVertexAttribOffset(i, gl.VERTEX_ATTRIB_ARRAY_POINTER),
        gl.getVertexAttrib(i, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING),
        gl.getVertexAttrib(i, gl.VERTEX_ATTRIB_ARRAY_DIVISOR),
      ];
      if (data[0]) {
        row.classList.add('attrib-enable');
      } else {
        row.classList.remove('attrib-enable');
      }
      data.forEach((value, cellNdx) => {
        const cell = row.cells[cellNdx];
        const newValue = formatters[cellNdx](value);
        updateElem(cell, newValue);
      });
    }
  };
  updateAttributes();

  const vaState = [
    {
      pname: 'ELEMENT_ARRAY_BUFFER_BINDING',
      formatter: formatWebGLObject,
      help: `
      buffer that contains element indices used when calling --gl.drawElements--.

      ---js
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, someBuffer);
      ---
      `,
    },
  ];
  const vaQueryFn = state => {
    const {pname} = state;
    const value = gl.getParameter(gl[pname]);
    return value;
  };

  const stateTable = createStateTable(vaState, vaElem.querySelector('.state-table'), 'state', vaQueryFn);
  makeDraggable(vaElem);

  return {
    elem: vaElem,
    updateAttributes,
    updateState: () => {
      updateStateTable(vaState, stateTable, vaQueryFn);
    },
  };
}

const stencilOps = helpToMarkdown(`--KEEP--, --ZERO--, --REPLACE--, --INCR--, --INCR_WRAP--, --DECR--, --DECR_WRAP--, --INVERT--`);
const stencilFuncSnippet = face => helpToMarkdown(`
---js
const func = gl.ALWAYS;
const ref = 0x1;
const mask = 0xFF;

// set for both front and back facing triangles
gl.stencilFunc(func, ref, mask);

// set only for ${face} facing triangles
const face = gl.${face.toUpperCase()};
gl.stencilFuncSeparate(face, func, ref, mask);
---
`);
const stencilFuncSetters = ['stencilFunc', 'stencilFuncSeparate'];
const stencilOpSnippet = face => helpToMarkdown(`
---js
const stencilFailOp = gl.KEEP;
const depthFailOp = gl.KEEP;
const depthPassUp = gl.INCR;

// sets for both front and back facing triangles
gl.stencilOp(stencilFailOp, depthFailOp, depthPassUp); 

// set only for ${face} facing triangles
const face = gl.${face.toUpperCase()};
gl.stencilOpSeparate(face, stencilFailOp, depthFailOp, depthPassUp);
---
`);
const stencilOpSetters = ['stencilOp', 'stencilOpSeparate'];
const stencilWriteMaskSnippet = face => `
write mask for stencil for ${face} facing triangles.

---js
const mask = 0xFF;

// set for both front and back facing triangles
gl.stencilMask(mask);

// set only for ${face} facing triangles.
const face = gl.${face.toUpperCase()};
gl.stencilMaskSeparate(face, mask);
---
`;
const stencilWriteMaskSetters = ['stencilMask', 'stencilMaskSeparate'];

const stencilState = [
    {
      pname: 'STENCIL_TEST',
      setter: ['enable', 'disable'],
      formatter: formatUniformValue,
      help: `
      Stencil test enabled/disabled

      ---js
      gl.enable(gl.STENCIL_TEST);
      gl.disable(gl.STENCIL_TEST);
      ---
      `,
    },
    {
      pname: 'STENCIL_FUNC',
      setter: stencilFuncSetters,
      formatter: formatEnum,
      help: `
      function to use for stencil test for front facing triangles.
      One of ${webglFuncs}.

${stencilFuncSnippet('front')}
      `,
    },
    {
      pname: 'STENCIL_FAIL',
      setter: stencilOpSetters,
      formatter: formatEnum,
      help: `
      operation when stencil test fails for front facing triangles.
      One of: ${stencilOps}

${stencilOpSnippet('front')}
      `,
    },
    {
      pname: 'STENCIL_PASS_DEPTH_FAIL',
      setter: stencilOpSetters,
      formatter: formatEnum,
      help: `
      operation when depth test fails for front facing triangles.
      One of: ${stencilOps}

${stencilOpSnippet('front')}
      `,
    },
    {
      pname: 'STENCIL_PASS_DEPTH_PASS',
      setter: stencilOpSetters,
      formatter: formatEnum,
      help: `
      operation when depth test passes for front facing triangles.
      One of: ${stencilOps}

${stencilOpSnippet('front')}
      `,
    },
    {
      pname: 'STENCIL_REF',
      setter: stencilFuncSetters,
      formatter: formatX2,
      help: `
      reference value to use for stencil test for front facing triangles.

${stencilFuncSnippet('front')}
      `,
    },
    {
      pname: 'STENCIL_VALUE_MASK',
      setter: stencilFuncSetters,
      formatter: formatX2,
      help: `
      mask value to use for stencil test for front facing triangles.

${stencilFuncSnippet('front')}
      `,
    },
    {
      pname: 'STENCIL_WRITEMASK',
      setter: stencilWriteMaskSetters,
      formatter: formatX2,
      help: stencilWriteMaskSnippet('front'),
    },
    {
      pname: 'STENCIL_BACK_FUNC',
      setter: stencilFuncSetters,
      formatter: formatEnum,
      help: `
      function to use for stencil test for back facing triangles.
      One of ${webglFuncs}.

${stencilFuncSnippet('back')}
      `,
    },
    {
      pname: 'STENCIL_BACK_FAIL',
      setter: stencilOpSetters,
      formatter: formatEnum,
      help: `
      operation when stencil test fails for back facing triangles.
      One of: ${stencilOps}

${stencilOpSnippet('back')}
      `,
    },
    {
      pname: 'STENCIL_BACK_PASS_DEPTH_FAIL',
      setter: stencilOpSetters,
      formatter: formatEnum,
      help: `
      operation when depth test fails for back facing triangles.
      One of: ${stencilOps}

${stencilOpSnippet('back')}
      `,
    },
    {
      pname: 'STENCIL_BACK_PASS_DEPTH_PASS',
      setter: stencilOpSetters,
      formatter: formatEnum,
      help: `
      operation when depth test passes for back facing triangles.
      One of: ${stencilOps}

${stencilOpSnippet('back')}
      `,
    },
    {
      pname: 'STENCIL_BACK_REF',
      setter: stencilFuncSetters,
      formatter: formatX2,
      help: `
      reference value to use for stencil test for back facing triangles.

${stencilFuncSnippet('back')}
      `,
    },
    {
      pname: 'STENCIL_BACK_VALUE_MASK',
      setter: stencilFuncSetters,
      formatter: formatX2,
      help: `
      mask value to use for stencil test for back facing triangles.

${stencilFuncSnippet('back')}
      `,
    },
    {
      pname: 'STENCIL_BACK_WRITEMASK',
      setter: stencilWriteMaskSetters,
      formatter: formatX2,
      help: stencilWriteMaskSnippet('front'),
    },
];

const blendFuncs = helpToMarkdown(`
--ZERO--,
--ONE--,
--SRC_COLOR--,
--ONE_MINUS_SRC_COLOR--,
--DST_COLOR--,
--ONE_MINUS_DST_COLOR--,
--SRC_ALPHA--,
--ONE_MINUS_SRC_ALPHA--,
--DST_ALPHA--,
--ONE_MINUS_DST_ALPHA--,
--CONSTANT_COLOR--,
--ONE_MINUS_CONSTANT_COLOR--,
--CONSTANT_ALPHA--,
--ONE_MINUS_CONSTANT_ALPHA--,
--SRC_ALPHA_SATURATE--
`);

const blendFuncSnippet = `
---js
// set both RGB and alpha to same value
const srcRGBFunc = gl.ONE;
const dstRGBFunc = gl.ONE_MINUS_SRC_ALPHA;
gl.blendFunc(srcRGBFunc, dstRGBFunc);

// set RGB and alpha to separate values
const srcAlphaFunc = gl.ONE;
const dstAlphaFunc = gl.ONE;
gl.blendFuncSeparate(
    srcRGBFunc, dstRGBFunc, srcAlphaFunc, dstAlphaFunc);
---
`;
const blendFuncSetters = ['blendFunc', 'blendFuncSeparate'];
const blendEquationSnippet = `
One of --FUNC_ADD--, --FUNC_SUBTRACT--, --FUNC_REVERSE_SUBTRACT--

---js
// set both RGB and ALPHA equations to the same value
const rgbEquation = gl.FUNC_ADD;
gl.blendEquation(rgbEquation);

// set RGB and alpha equations to separate values
const alphaEquation = gl.FUNC_SUBTRACT;
gl.blendEquationSeparate(rgbEquation, alphaEquation);
---
`;
const blendEquationSetters = ['blendEquation', 'blendEquationSeparate'];

const blendState = [
    {
      pname: 'BLEND',
      setter: ['enable', 'disable'],
      formatter: formatBoolean,
      help: `
      blending enabled/disabled

      ---js
      gl.enable(gl.BLEND);
      gl.disable(gl.BLEND);
      ---
      `,
    },
    {
      pname: 'BLEND_DST_RGB',
      setter: blendFuncSetters,
      formatter: formatEnumZero,
      help: `
      The blend function for destination RGB.
      One of ${blendFuncs}.

${blendFuncSnippet}
      `,
    },
    {
      pname: 'BLEND_SRC_RGB',
      setter: blendFuncSetters,
      formatter: formatEnumZero,
      help: `
      The blend function for source RGB.
      One of ${blendFuncs}.

${blendFuncSnippet}
      `,
    },
    {
      pname: 'BLEND_DST_ALPHA',
      setter: blendFuncSetters,
      formatter: formatEnumZero,
      help: `
      The blend function for destination alpha
      One of ${blendFuncs}.

${blendFuncSnippet}
      `,
    },
    {
      pname: 'BLEND_SRC_ALPHA',
      setter: blendFuncSetters,
      formatter: formatEnumZero,
      help: `
      The blend function for source alpha
      One of ${blendFuncs}.

${blendFuncSnippet}
      `,
    },
    {
      pname: 'BLEND_COLOR',
      setter: 'blendColor',
      formatter: formatUniformValue,
      help: `
      constant color and alpha used when blend function
      is --gl.CONSTANT_COLOR--, --gl.CONSTANT_ALPHA--,
      --gl.ONE_MINUS_CONSTANT_COLOR--, or --gl.ONE_MINUS_CONSTANT_ALPHA--.

      ---js
      gl.blendColor(r, g, b, a);
      ---
      `,
    },
    {
      pname: 'BLEND_EQUATION_RGB',
      setter: blendEquationSetters,
      formatter: formatEnum,
      help: `
      Blend equation for RGB.

${blendEquationSnippet}
      `,
    },
    {
      pname: 'BLEND_EQUATION_ALPHA',
      setter: blendEquationSetters,
      formatter: formatEnum,
      help: `
      Blend equation for alpha  .

${blendEquationSnippet}
      `,
    },
];

const polygonState = [
    {
      pname: 'CULL_FACE',
      setter: ['enable', 'disable'],
      formatter: formatBoolean,
      help: `
      Whether or not to cull triangles based on which way they are facing.

      ---js
      // enable
      gl.enable(gl.CULL_FACE);

      // disable
      gl.disable(gl.CULL_FACE);
      ---
      `,
    },
    {
      pname: 'CULL_FACE_MODE',
      setter: 'cullFace',
      formatter: formatEnum,
      help: `
      Which faces are culled when culling is on. Valid values are
      --FRONT--, --BACK--, --FRONT_AND_BACK--. 

      ---js
      gl.cullFace(gl.FRONT);
      ---
      `,
    },
    {
      pname: 'FRONT_FACE',
      setter: 'frontFace',
      formatter: formatEnum,
      help: `
      Which faces are considered front facing. Valid values are
      --CW--, --CCW--. 

      ---js
      gl.frontFace(gl.CW);
      ---
      `,
    },
    {
      pname: 'POLYGON_OFFSET_UNITS',
      setter: 'polygonOffset',
      formatter: formatUniformValue,
      help: `The amount to offset the calculated depth value for the depth test.

      ---js
      const factor = 0;
      const units = 1;
      gl.polygonOffset(factor, units);
      ---
      `,
    },
    {
      pname: 'POLYGON_OFFSET_FACTOR',
      setter: 'polygonOffset',
      formatter: formatUniformValue,
      help: `The depth factor to offset the calculated depth value for the depth test.

      ---js
      const factor = 1;
      const units = 0;
      gl.polygonOffset(factor, units);
      ---
      `,
    },
];

const clearState = [
    {
      pname: 'COLOR_CLEAR_VALUE',
      setter: 'clearColor',
      formatter: formatUniformValue,
      help: `
      Value to clear the color buffer to when calling --gl.clear--
      with the --gl.COLOR_BUFFER_BIT-- set

      Be aware by default a canvas is composited with the webpage
      using premultiplied alpha.

      ---js
      const r = 1;
      const g = 0.5;
      const b = 0.3;
      const a = 1;
      gl.clearColor(r, g, b, a);
      ---
      `,
    },
    {
      pname: 'DEPTH_CLEAR_VALUE',
      setter: 'clearDepth',
      formatter: formatG,
      help: `
      the value to clear the depth buffer to when calling --gl.clear--
      with the --gl.DEPTH_BUFFER_BIT-- set

      ---js
      gl.clearDepth(value);
      ---
      `,
    },
    {
      pname: 'STENCIL_CLEAR_VALUE',
      setter: 'clearStencil',
      formatter: formatX2,
      help: `
      the value to clear the depth buffer to when calling --gl.clear--
      with the --gl.STENCIL_BUFFER_BIT-- set

      ---js
      gl.clearStencil(0xFF);
      ---
      `,
    },
];

const commonState = [
    {
      pname: 'VIEWPORT',
      setter: 'viewport',
      formatter: formatUniformValue,
      help: `
      How to convert from clip space to pixel space.

      ---js
      const x = 0;
      const y = 0;
      const width = gl.canvas.width;
      const height = gl.canvas.height;
      gl.viewport(x, y, width, height);
      ---
      `,
    },
    {
      pname: 'ARRAY_BUFFER_BINDING',
      setter: [],
      formatter: formatWebGLObject,
      help: `
      The --ARRAY_BUFFER-- binding point is mostly
      just like an internal variable inside webgl. You set it by calling
      --gl.bindBuffer(gl.ARRAY_BUFFER, someBuffer);-- and then all other
      buffer functions can refer to the buffer bound there.
      `,
    },
    {
      pname: 'CURRENT_PROGRAM',
      setter: ['useProgram'],
      formatter: formatWebGLObject,
      help: `
      The current program. Used when calling --gl.drawArrays--, --gl.drawElements--
      and --gl.uniformXXX---.

      ---js
      gl.useProgram(someProgram);
      ---
      `,
    },
    {
      pname: 'VERTEX_ARRAY_BINDING',
      setter: ['bindVertexArray'],
      formatter: formatWebGLObjectOrDefaultVAO,
      help: `
      The current vertex array. In WebGL 1.0 this is only settable via the 
      [--OES_vertex_array_object--](https://www.khronos.org/registry/webgl/extensions/OES_vertex_array_object/)
      extension. Otherwise there is only the 1 default vertex array in WebGL 1.0.
      `,
    },
    {
      pname: 'ACTIVE_TEXTURE',
      setter: 'activeTexture',
      formatter: formatEnum,
      help: `
      The --ACTIVE_TEXTURE-- is just an index into the texture units array
      so that other function that take a target like --TEXTURE_2D-- or
      --TEXTURE_CUBE_MAP-- know which texture unit to look at. It is set
      with --gl.activeTexture(gl.TEXTURE0 + unit)--

      **Pseudo Code**

      ---js
      class WebGL {
        constructor() {
          this.activeTexture = 0;
          this.textureUnits = [
            { TEXTURE_2D: null, TEXTURE_CUBE_MAP: null, }, 
            { TEXTURE_2D: null, TEXTURE_CUBE_MAP: null, }, 
            ...
          ]
        }
        activeTexture(enum) {
          this.activeTexture = enum - gl.TEXTURE0;  // convert to index
        }
        texParameteri(target, pname, value) {
          const texture = this.textureUnits[this.activeTexture][target];
          ... set parameter on 'texture'...
        }
        ...
      ---
      `,
    },
];

const miscState = [
    {
      pname: 'COLOR_WRITEMASK',
      setter: 'colorMask',
      formatter: formatUniformValue,
      help: `
      sets which channels can be written to. Set with

      ---js
      const red = true;
      const green = true;
      const blue = true;
      const alpha = true;
      gl.colorMask(red, green, blue, alpha);
      ---
      `,
    },
    {
      pname: 'SCISSOR_TEST',
      setter: ['enable', 'disable'],
      formatter: formatUniformValue,
      help: `
      Whether the scissor test is enabled

      ---js
      // enable
      gl.enable(gl.SCISSOR_TEST);

      // disable
      gl.disable(gl.SCISSOR_TEST);
      ---
      `,
    },
    {
      pname: 'SCISSOR_BOX',
      setter: 'scissor',
      formatter: formatUniformValue,
      help: `
      The dimensions of the scissor test. If the the scissor test is enabled
      then WebGL will not rendered pixels outside the scissor box.

      ---js
      const x = 50;
      const y = 60;
      const width = 70;
      const height = 80;
      gl.scissor(x, y, width, height);
      ---
      `,
    },
    {
      pname: 'UNPACK_ALIGNMENT',
      setter: 'pixelStorei',
      formatter: formatUniformValue,
      help: `
      Used by --texImage-- functions. Each row of data
      must be aligned by this number of bytes and a multiple of this
      number of bytes. Valid values are --1--, --2--, --4--, and --8--.
      Default: --4--

      ---js
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      ---
      `,
    },
    {
      pname: 'PACK_ALIGNMENT',
      setter: 'pixelStorei',
      formatter: formatUniformValue,
      help: `
      Used by --readPixels-- function. Each row of data
      must be aligned by this number of bytes and a multiple of this
      number of bytes. Valid values are --1--, --2--, --4--, and --8--.
      Default: --4--

      ---js
      gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
      ---
      `,
    },
];

function createBufferDisplay(parent, name /*, webglObject */) {
  const bufElem = createTemplate(parent, '#buffer-template');
  setName(bufElem, name);
  const dataExpander = createExpander(bufElem, 'data');
  const dataElem = addElem('code', dataExpander, {className: 'data'});

  const updateData = (dataOrSize) => {
    const maxValues = 9;
    const data = typeof dataOrSize === 'number' ? new Array(maxValues).fill(0) : dataOrSize;
    expand(dataExpander);
    flash(dataElem);
    const value = formatUniformValue(Array.from(data).slice(0, maxValues));
    dataElem.textContent = `${value}${data.length > maxValues ? ', ...' : ''}`;
  };

  makeDraggable(bufElem);
  return {
    elem: bufElem,
    updateData,
  };
}

function createTextureDisplay(parent, name, texture, imgHref) {
  const texElem = createTemplate(parent, '#texture-template');
  setName(texElem, name);

  const activeTexNote = helpToMarkdown(`
    note: the texture affected is the current active texture on
    the specified bind point. ie (--webglState.textureUnits[activeTexture][bindPoint]--)
  `);

  const mipsExpander = createExpander(texElem, 'mips');
  const mipsOuterElem = addElem('div', mipsExpander);
  const mipsElem = addElem('div', mipsOuterElem, {className: 'mips'});
  const numMips = 8;
  for (let i = 0; i < numMips; ++i) {
    const size = 2 ** (numMips - i - 1);
    addElem('div', mipsElem, {
      className: `mip${i}`,
      style: { backgroundImage: `url(${imgHref})` },
      dataset: {
        help: helpToMarkdown(`
          Uploading data

          ---js
          const target = gl.TEXTURE_2D;
          const level = ${i};
          const internalFormat = gl.RGBA;
          const width = ${size};
          const height = ${size};
          const format = gl.RGBA;
          const type = gl.UNSIGNED_BYTE;
          gl.texImage2D(
              target, level, internalFormat,
              width, height, 0, format, type,
              someUnit8ArrayWith${size}x${size}x4Values);
          ---

          Uploading an image/canvas/video. The image must
          have finished downloading.

          ---js
          const target = gl.TEXTURE_2D;
          const level = ${i};
          const internalFormat = gl.RGBA;
          const format = gl.RGBA;
          const type = gl.UNSIGNED_BYTE;
          gl.texImage2D(
              target, level, internalFormat,
              format, type, imageCanvasVideoElem);
          ---

          mips > 0 can be generated by calling
          --gl.genererateMipmap(gl.TEXTURE_2D);--

          ${activeTexNote}`),
      },
    });
  }

  const updateData = () => {};

  const texState = [
   {
      pname: 'TEXTURE_WRAP_S',
      formatter: formatEnum,
      help: `
      what happens for texture coordinates outside the 0 to 1 range
      in the S direction (horizontal). Can be one of --gl.REPEAT--,
      --gl.CLAMP_TO_EDGE--, --gl.MIRRORED_REPEAT--. **For non power
      of 2 textures must be --gl.CLAMP_TO_EDGE--**.

      ---js
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      ---

      ${activeTexNote}`,
    },
    {
      pname: 'TEXTURE_WRAP_T',
      formatter: formatEnum,
      help: `
      what happens for texture coordinates outside the 0 to 1 range
      in the S direction (vertical). Can be one of --gl.REPEAT--,
      --gl.CLAMP_TO_EDGE--, --gl.MIRRORED_REPEAT--. **For non power
      of 2 textures must be --gl.CLAMP_TO_EDGE--**.

      ---js
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      ---

      ${activeTexNote}`,
    },
    {
      pname: 'TEXTURE_MIN_FILTER',
      formatter: formatEnum,
      help: `
      How the texture is sampled when drawn smaller than its intrinsic size.
      Can be one of:
      --gl.NEAREST--,
      --gl.LINEAR--,
      --gl.NEAREST_MIPMAP_NEAREST--,
      --gl.LINEAR_MIPMAP_NEAREST--,
      --gl.NEAREST_MIPMAP_LINEAR--,
      --gl.LINEAR_MIPMAP_LINEAR--.
      **For non power of 2 textures must be --gl.NEAREST-- or --gl.LINEAR--**.

      ---js
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
      ---

      ${activeTexNote}`,
    },
    {
      pname: 'TEXTURE_MAG_FILTER',
      formatter: formatEnum,
      help: `
      How the texture is sampled when drawn larger than its intrinsic size.
      Can be one of
      --gl.NEAREST--,
      --gl.LINEAR--.

      ---js
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      ---

      ${activeTexNote}`,
    },
  ];

  const queryFn = state => {
    const {pname} = state;
    const info = webglObjects.get(texture);
    const target = info.target;
    const value = gl.getTexParameter(target, gl[pname]);
    return value;
  };

  const stateTable = createStateTable(texState, texElem, 'texture state', queryFn, false);
  makeDraggable(texElem);
  return {
    elem: texElem,
    updateData,
    updateState: () => {
      updateStateTable(texState, stateTable, queryFn);
    },
  };
}

function createTextureUnits(parent, maxUnits = 8) {
  const expander = createExpander(parent, 'Texture Units');
  const tbody = createTable(expander, ['2D', 'CUBE_MAP']);
  for (let i = 0; i < maxUnits; ++i) {
    const tr = addElem('tr', tbody);
    addElem('td', tr, {
      textContent: 'null',
      dataset: {
        help: helpToMarkdown(`
          bind a texture to this unit with

          ---js
          gl.activeTexture(gl.TEXTURE0 + ${i});
          gl.bindTexture(gl.TEXTURE_2D, someTexture);
          ---
        `),
      },
    });
    addElem('td', tr, {
      textContent: 'null',
      dataset: {
        help: helpToMarkdown(`
          bind a texture to this unit with

          ---js
          gl.activeTexture(gl.TEXTURE0 + ${i});
          gl.bindTexture(gl.TEXTURE_CUBE_MAP, someTexture);
          ---
        `),
      },
    });
  }

  const targets = [gl.TEXTURE_BINDING_2D, gl.TEXTURE_BINDING_CUBE_MAP];
  const updateCurrentTextureUnit = () => {
    const unit = gl.getParameter(gl.ACTIVE_TEXTURE) - gl.TEXTURE0;
    const row = tbody.rows[unit];
    targets.forEach((target, colNdx) => {
      updateElem(row.cells[colNdx], formatWebGLObject(gl.getParameter(target)));
    });
  };

  return {
    elem: expander,
    updateCurrentTextureUnit,
  };
}

function expand(elem) {
  if (elem.classList.contains('expander')) {
    elem.classList.add('open');
  } else {
    elem.querySelector('.expander').classList.add('open');
  }
  return elem;
}

const diagramElem = document.querySelector('#diagram');
const codeElem = document.querySelector('#code');

function globalStateQuery(state) {
  const {pname} = state;
  const value = gl.getParameter(gl[pname]);
  if (gl.getError()) {
    debugger;  // eslint-disable-line no-debugger
  }
  return value;
}
const defaultVAOInfo = {
  ui: createVertexArrayDisplay(diagramElem, '*default*', null),
};

const settersToWrap = {};

function createStateUI(stateTable, parent, name, queryFn) {
  const elem = createStateTable(stateTable, parent, name, queryFn);
  const updateState = () => {
    updateStateTable(stateTable, elem, queryFn);
  };

  for (const state of stateTable) {
    const setters = Array.isArray(state.setter) ? state.setter : [state.setter];
    for (const setter of setters) {
      if (!settersToWrap[setter]) {
        settersToWrap[setter] = [];
      }
      const stateUpdaters = settersToWrap[setter];
      if (stateUpdaters.indexOf(updateState) < 0) {
        stateUpdaters.push(updateState);
      }
    }
  }
  return {
    elem,
    updateState,
  };
}
const globalState = document.querySelector('#global-state');
const globalUI = {
  commonState: createStateUI(commonState, globalState, 'common state', globalStateQuery),
  textureUnits: createTextureUnits(globalState, 8),
  clearState: createStateUI(clearState, globalState, 'clear state', globalStateQuery),
  depthState: createStateUI(depthState, globalState, 'depth state', globalStateQuery),
  blendState: createStateUI(blendState, globalState, 'blend state', globalStateQuery),
  miscState: createStateUI(miscState, globalState, 'misc state', globalStateQuery),
  stencilState: createStateUI(stencilState, globalState, 'stencil state', globalStateQuery),
  polygonState: createStateUI(polygonState, globalState, 'polygon state', globalStateQuery),
};
expand(globalUI.textureUnits.elem);
expand(globalUI.commonState.elem);
expand(globalUI.clearState.elem);
expand(globalUI.depthState.elem);

makeDraggable(globalState, 10, 10);
makeDraggable(document.querySelector('#canvas'), -10, 10);


let currentLine;
let unknownId = 0;
const nameRE = /\s+(\w+)\s*=\s*\w+\.create\w+/;

function wrapFn(fnName, fn) {
  gl[fnName] = function(origFn) {
    if (!origFn) {
      debugger;  // eslint-disable-line no-debugger
    }
    return function(...args) {
      return fn.call(this, origFn, ...args);
    };
  }(gl[fnName]);
}

function wrapCreationFn(fnName, uiFactory) {
  wrapFn(fnName, function(origFn, ...args) {
    const webglObject = origFn.call(this, ...args);
    const m = nameRE.exec(currentLine.trim());
    const name = m ? m[1] : `-unknown${++unknownId}-`;
    webglObjects.set(webglObject, {
      name,
      ui: uiFactory(name, webglObject),
    });
    return webglObject;
  });
}

function wrapDeleteFn(fnName) {
  wrapFn(fnName, function(origFn, webglObject) {
    origFn.call(this, webglObject);
    const info = webglObjects.get(webglObject);
    info.deleted = true;
    const {elem} = info.ui;
    elem.parentElement.removeChild(elem);
  });
}

wrapCreationFn('createTexture', (name, webglObject) => {
  return createTextureDisplay(diagramElem, name, webglObject, '/webgl/resources/f-texture.png');
});
wrapCreationFn('createBuffer', (name, webglObject) => {
  return createBufferDisplay(diagramElem, name, webglObject);
});
wrapCreationFn('createShader', (name, webglObject) => {
  return createShaderDisplay(diagramElem, name, webglObject);
});
wrapCreationFn('createProgram', (name, webglObject) => {
  return createProgramDisplay(diagramElem, name, webglObject);
});
wrapDeleteFn('deleteTexture');
wrapDeleteFn('deleteBuffer');
wrapDeleteFn('deleteShader');
wrapDeleteFn('deleteProgram');

for (const [fnName, stateUpdaters] of Object.entries(settersToWrap)) {
  wrapFn(fnName, function(origFn, ...args) {
    origFn.call(this, ...args);
    stateUpdaters.forEach(updater => updater());
  });
}

Object.keys(WebGLRenderingContext.prototype)
    .filter(name => /^uniform(\d|Matrix)/.test(name))
    .forEach((fnName) => {
      wrapFn(fnName, function(origFn, ...args) {
        origFn.call(this, ...args);
        const program = gl.getParameter(gl.CURRENT_PROGRAM);
        const {ui} = webglObjects.get(program);
        ui.updateUniforms();
      });
    });

wrapFn('bindTexture', function(origFn, target, texture) {
  origFn.call(this, target, texture);
  const info = webglObjects.get(texture);
  if (!info.target) {
    info.target = target;
    info.ui.updateState();
  }
  globalUI.textureUnits.updateCurrentTextureUnit(target);
});
function getCurrentTextureForTarget(target) {
  if (target === gl.TEXTURE_CUBE_MAP) {
    return gl.getParameter(gl.TEXTURE_BINDING_CUBE_MAP);
  }
  if (target === gl.TEXTURE_2D) {
    return gl.getParameter(gl.TEXTURE_BINDING_2D);
  }
  throw new Error(`unknown target: ${target}`);
}
wrapFn('texParameteri', function(origFn, target, ...args) {
  origFn.call(this, target, ...args);
  const texture = getCurrentTextureForTarget(target);
  const {ui} = webglObjects.get(texture);
  ui.updateState();
});
wrapFn('shaderSource', function(origFn, shader, source) {
  origFn.call(this, shader, source);
  const {ui} = webglObjects.get(shader);
  ui.updateSource();
});

wrapFn('attachShader', function(origFn, program, shader) {
  origFn.call(this, program, shader);
  const {ui} = webglObjects.get(program);
  ui.updateAttachedShaders();
});

wrapFn('compileShader', function(origFn, shader) {
  origFn.call(this, shader);
  const {ui} = webglObjects.get(shader);
  ui.updateState();
});

wrapFn('linkProgram', function(origFn, program) {
  origFn.call(this, program);
  const {ui} = webglObjects.get(program);
  ui.updateState();
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
    ui.scanAttributes();
    ui.scanUniforms();
  }
});
wrapFn('bindBuffer', function(origFn, bindPoint, buffer) {
  origFn.call(this, bindPoint, buffer);
  if (bindPoint === gl.ARRAY_BUFFER) {
    globalUI.commonState.updateState();
  } else {
    const {ui} = getCurrentVAOInfo();
    ui.updateState();
  }
});
wrapFn('bufferData', function(origFn, bindPoint, dataOrSize, hint) {
  origFn.call(this, bindPoint, dataOrSize, hint);
  const buffer = gl.getParameter(bindPoint === gl.ARRAY_BUFFER ? gl.ARRAY_BUFFER_BINDING : gl.ELEMENT_ARRAY_BUFFER_BINDING);
  const {ui} = webglObjects.get(buffer);
  ui.updateData(dataOrSize);
});
function getCurrentVAOInfo() {
  //const vertexArray = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
  //const info = vertexArray ? webglObjects.get(vertexArray) : defaultVAOInfo;
  return defaultVAOInfo;
}
wrapFn('enableVertexAttribArray', function(origFn, ...args) {
  origFn.call(this, ...args);
  const {ui} = getCurrentVAOInfo();
  ui.updateAttributes();
});
wrapFn('disableVertexAttribArray', function(origFn, ...args) {
  origFn.call(this, ...args);
  const {ui} = getCurrentVAOInfo();
  ui.updateAttributes();
});
wrapFn('vertexAttribPointer', function(origFn, ...args) {
  origFn.call(this, ...args);
  const {ui} = getCurrentVAOInfo();
  ui.updateAttributes();
});

const js = document.querySelector('#js').text;
const lines = [...js.matchAll(/[^`;]*(?:`[^`]*?`)?[^`;]*;?;\n/g)].map(m => {
  let code = m[0];
  if (code.startsWith('\n')) {
    code = code.substr(1);
    addElem('div', codeElem, {textContent: ' ', className: 'hljs'});
  }
  const elem = addElem('div', codeElem);
  addElem('div', elem, {className: 'line-marker'});
  hljs.highlightBlock(addElem('pre', elem, {textContent: code}));
  return {
    code,
    elem,
  };
});

let currentLineNo = 0;

const stepElem = document.querySelector('#step');
stepElem.addEventListener('click', step);
const runElem = document.querySelector('#run');
runElem.addEventListener('click', run);

function step() {
  lines[currentLineNo].elem.classList.remove('current-line');
  execute(lines[currentLineNo++].code);
  highlightCurrentLine();
}

function highlightCurrentLine() {
  if (currentLineNo < lines.length) {
    const {elem} = lines[currentLineNo];
    elem.classList.add('current-line');
    elem.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    });
  }
}
highlightCurrentLine();

function execute(code) {
  currentLine = code;
  eval(code.replace(/const |let /g, ''));  // eslint-disable-line no-eval
}

async function run() {
  while (currentLineNo < lines.length) {
    step();
    await wait(50);
  }
}

/*
var divA       = globalState;
var divB       = tx;
var arrowLeft  = document.querySelector("#arrowLeft");
var arrowRight = document.querySelector("#arrowRight");

function getPageRelativePos(elem) {
  const rect = elem.getBoundingClientRect();
  return {
    left: rect.left + window.scrollX | 0,
    top: rect.top + window.scrollY | 0,
    width: rect.width,
    height: rect.height,
  };
}
var drawConnector = function() {
  const divAPos = getPageRelativePos(divA);
  const divBPos = getPageRelativePos(divB);
  var posnALeft = {
    x: divAPos.left - 8,
    y: divAPos.top  + divAPos.height / 2,
  };
  var posnARight = {
    x: divAPos.left + divAPos.width + 8,
    y: divAPos.top  + divAPos.height / 2
  };
  var posnBLeft = {
    x: divBPos.left - 8,
    y: divBPos.top  + divBPos.height / 2
  };
  var posnBRight = {
    x: divBPos.left + divBPos.width + 8,
    y: divBPos.top  + divBPos.height / 2
  };
  var dStrLeft =
      "M" +
      (posnALeft.x      ) + "," + (posnALeft.y) + " " +
      "C" +
      (posnALeft.x - 100) + "," + (posnALeft.y) + " " +
      (posnBLeft.x - 100) + "," + (posnBLeft.y) + " " +
      (posnBLeft.x      ) + "," + (posnBLeft.y);
  arrowLeft.setAttribute("d", dStrLeft);
  var dStrRight =
      "M" +
      (posnBRight.x      ) + "," + (posnBRight.y) + " " +
      "C" +
      (posnBRight.x + 100) + "," + (posnBRight.y) + " " +
      (posnARight.x + 100) + "," + (posnARight.y) + " " +
      (posnARight.x      ) + "," + (posnARight.y);
  arrowRight.setAttribute("d", dStrRight);
};

//drawConnector();
*/