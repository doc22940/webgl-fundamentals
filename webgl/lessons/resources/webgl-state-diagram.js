/* eslint strict: "off" */
//'use strict';

hljs.initHighlightingOnLoad();

const px = (v) => `${v}px`;

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
    value: 'TRUE',
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
    value: 'LESS',
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
    value: '0, 1',
    help: `
      specifies how to convert from clip space to a depth value

      ---js
      gl.depthRange(zNear, zFar);
      ---
    `,
  },
  {
    pname: 'DEPTH_WRITEMASK',
    value: 'true',
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

function createStateTable(states, parent, title) {
  const expander = createExpander(parent, title);
  const table = addElem('table', expander);
  const tbody = addElem('tbody', table);
  for (const state of states) {
    const {pname, value, help} = state;
    const tr = addElem('tr', tbody);
    tr.dataset.help = helpToMarkdown(help);
    addElem('td', tr, {textContent: pname});
    addElem('td', tr, {textContent: value});
  }
  return expander;
}

function isBuiltIn(info) {
  const name = info.name;
  return name.startsWith("gl_") || name.startsWith("webgl_");
}

function createProgramAttributes(parent, gl, program) {
  const tbody = createTable(parent, ['name', 'location']);

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
function getBindPointForSamplerType(gl, type) {
  return typeMap[type].bindPoint;
}

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

function formatG(v) {
  return v.toFixed(3).replace(/\.?0+$/, '');
}

function formatUniformValue(v) {
  if (v.buffer && v.buffer instanceof ArrayBuffer) {
    v = Array.from(v);
  }
  if (Array.isArray(v)) {
    if (v.length === 16) {
      const s = [];
      v.forEach((v, ndx) => {
        s.push(`${formatG(v)}${ndx !== v.length - 1 ? ',' : ''}${ndx % 4 === 3 ? '\n' : ''}`);
      });
      return s.join('');
    }
    return v.map(formatG).join(', ');
  }
  return typeof v === 'number' ? formatG(v) : v;
}

function createProgramUniforms(parent, gl, program) {
  const tbody = createTable(parent, ['name', 'loc', 'value']);
  const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

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
    const loc = gl.getUniformLocation(program, name);
    const info = getUniformInfo(uniformInfo.type);
    const help = helpToMarkdown(`---js\ngl.useProgram(program); // set current program\n${info.setter}\n---`);

    const tr = addElem('tr', tbody);
    addElem('td', tr, {textContent: name, dataset: {help}});
    addElem('td', tr, {
      textContent: '?',
      dataset: {
        help: helpToMarkdown(`---js\nconst loc = gl.getUniformLocation(program, '${name}');\n---`),
      },
    });
    addElem('td', tr, {
      textContent: formatUniformValue(gl.getUniform(program, loc)),
      dataset: {help},
    });
  }
}

function setName(elem, name) {
  const nameElem = elem.querySelector('.name');
  nameElem.textContent = `${nameElem.textContent}[${name}]`;
}

const shaderState = [
 {
    pname: 'COMPILE_STATUS',
    value: 'false',
    help: `
    Whether or not the last call to --gl.compileShader-- was successful.
    `,
  },
];

function createShaderDisplay(parent, name, shader) {
  const type = gl.getShaderParameter(shader, gl.SHADER_TYPE) === gl.VERTEX_SHADER ? 'vertex' : 'fragment';

  const shElem = createTemplate(parent, `#${type}-shader-template`);
  setName(shElem, name);

  expand(createStateTable(shaderState, shElem, 'state'));
  makeDraggable(shElem);

  return shElem;
}

const programState = [
 {
   pname: `ATTACHED_SHADERS`,
   value: `[]`,
   help: `
   shaders attached with

   ---js
   gl.attachShader(program, shader);
   ---
   `,
 },
 {
    pname: 'LINK_STATUS',
    value: 'false',
    help: `
    Whether or not the last call to --gl.linkProgram-- was successful.
    `,
  },
];

function createProgramDisplay(parent, name, program) {
  const prgElem = createTemplate(parent, '#program-template');
  setName(prgElem, name);

  expand(createStateTable(programState, prgElem, 'state'));
  makeDraggable(prgElem);
  return prgElem;
}

function foob() {
  const shaders = gl.getAttachedShaders(program);

  // sort so VERTEX_SHADER is first.
  shaders.sort((a, b) => {
    const aType = gl.getShaderParameter(a, gl.SHADER_TYPE);
    const bType = gl.getShaderParameter(b, gl.SHADER_TYPE);
    return aType < bType;
  });

  const types = ['vertex', 'fragment'];
  types.forEach((type, ndx) => {
    createShaderDisplay(prgElem, type, gl.getShaderSource(shaders[ndx]));
  });

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

  createProgramAttributes(attribExpander, gl, prg);
  createProgramUniforms(uniformExpander, gl, prg);

  expand(attribExpander);
  expand(uniformExpander);

  makeDraggable(prgElem);
  return prgElem;
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

function createVertexArrayDisplay(parent, attribs = [], maxAttribs = 8) {
  const vaElem = createTemplate(parent, '#vertex-array-template');
  const vaoNote = helpToMarkdown(`
    note: the current vertex array can be set with the
    [--OES_vertex_array_object--](https://www.khronos.org/registry/webgl/extensions/OES_vertex_array_object/)
    extension. Otherwise there is only the 1 default vertex array in WebGL 1.0.
  `);
  const attrExpander = createExpander(vaElem.querySelector('.state-table'), 'attributes');
  const table = createTemplate(attrExpander, '#vertex-attributes-template');
  const attrsElem = table.querySelector('tbody');

  for (let i = 0; i < maxAttribs; ++i) {
    const {size = 1, type = 'FLOAT', normalize = 'false', stride = '0', offset = '0', buffer = 'null', divisor = '0'} = attribs[i] || {};
    const enabled = i < attribs.length;
    const enabledClassName = enabled ? 'attrib-enabled' : 'attrib-disabled';
    const disabledClassName = enabled ? 'attrib-disabled' : 'attrib-enabled';
    const tr = addElem('tr', attrsElem);
    addElem('td', tr, {
      textContent: enabled,
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
      textContent: '0,0,0,1',
      className: disabledClassName,
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
      textContent: size,
      className: enabledClassName,
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
      textContent: type,
      className: enabledClassName,
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
      textContent: normalize,
      className: enabledClassName,
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
      textContent: stride,
      className: enabledClassName,
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
      textContent: offset,
      className: enabledClassName,
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
      textContent: buffer,
      className: enabledClassName,
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
      textContent: divisor,
      className: enabledClassName,
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

  const vaState = [
    {
      pname: 'ELEMENT_ARRAY_BUFFER',
      value: 'null',
      help: `
      buffer that contains element indices used when calling --gl.drawElements--.

      ---js
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, someBuffer);
      ---
      `,
    },
  ];
  createStateTable(vaState, vaElem.querySelector('.state-table'), 'state');
  makeDraggable(vaElem);
  return vaElem;
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

const stencilState = [
    {
      pname: 'STENCIL_TEST',
      value: 'false',
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
      value: 'ALWAYS',
      help: `
      function to use for stencil test for front facing triangles.
      One of ${webglFuncs}.

${stencilFuncSnippet('front')}
      `,
    },
    {
      pname: 'STENCIL_FAIL',
      value: 'KEEP',
      help: `
      operation when stencil test fails for front facing triangles.
      One of: ${stencilOps}

${stencilOpSnippet('front')}
      `,
    },
    {
      pname: 'STENCIL_PASS_DEPTH_FAIL',
      value: 'KEEP',
      help: `
      operation when depth test fails for front facing triangles.
      One of: ${stencilOps}

${stencilOpSnippet('front')}
      `,
    },
    {
      pname: 'STENCIL_PASS_DEPTH_PASS',
      value: 'KEEP',
      help: `
      operation when depth test passes for front facing triangles.
      One of: ${stencilOps}

${stencilOpSnippet('front')}
      `,
    },
    {
      pname: 'STENCIL_REF',
      value: '0',
      help: `
      reference value to use for stencil test for front facing triangles.

${stencilFuncSnippet('front')}
      `,
    },
    {
      pname: 'STENCIL_VALUE_MASK',
      value: '',
      help: `
      mask value to use for stencil test for front facing triangles.

${stencilFuncSnippet('front')}
      `,
    },
    {
      pname: 'STENCIL_WRITEMASK',
      value: '0xFF',
      help: stencilWriteMaskSnippet('front'),
    },
    {
      pname: 'STENCIL_BACK_FUNC',
      value: 'ALWAYS',
      help: `
      function to use for stencil test for back facing triangles.
      One of ${webglFuncs}.

${stencilFuncSnippet('back')}
      `,
    },
    {
      pname: 'STENCIL_BACK_FAIL',
      value: 'KEEP',
      help: `
      operation when stencil test fails for back facing triangles.
      One of: ${stencilOps}

${stencilOpSnippet('back')}
      `,
    },
    {
      pname: 'STENCIL_BACK_PASS_DEPTH_FAIL',
      value: 'KEEP',
      help: `
      operation when depth test fails for back facing triangles.
      One of: ${stencilOps}

${stencilOpSnippet('back')}
      `,
    },
    {
      pname: 'STENCIL_BACK_PASS_DEPTH_PASS',
      value: 'KEEP',
      help: `
      operation when depth test passes for back facing triangles.
      One of: ${stencilOps}

${stencilOpSnippet('back')}
      `,
    },
    {
      pname: 'STENCIL_BACK_REF',
      value: '0',
      help: `
      reference value to use for stencil test for back facing triangles.

${stencilFuncSnippet('back')}
      `,
    },
    {
      pname: 'STENCIL_BACK_VALUE_MASK',
      value: '0xFF',
      help: `
      mask value to use for stencil test for back facing triangles.

${stencilFuncSnippet('back')}
      `,
    },
    {
      pname: 'STENCIL_BACK_WRITEMASK',
      value: '0xFF',
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

const blendState = [
    {
      pname: 'BLEND',
      value: 'false',
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
      value: 'ZERO',
      help: `
      The blend function for destination RGB.
      One of ${blendFuncs}.

${blendFuncSnippet}
      `,
    },
    {
      pname: 'BLEND_SRC_RGB',
      value: 'ONE',
      help: `
      The blend function for source RGB.
      One of ${blendFuncs}.

${blendFuncSnippet}
      `,
    },
    {
      pname: 'BLEND_DST_ALPHA',
      value: 'ZERO',
      help: `
      The blend function for destination alpha
      One of ${blendFuncs}.

${blendFuncSnippet}
      `,
    },
    {
      pname: 'BLEND_SRC_ALPHA',
      value: 'ONE',
      help: `
      The blend function for source alpha
      One of ${blendFuncs}.

${blendFuncSnippet}
      `,
    },
    {
      pname: 'BLEND_COLOR',
      value: '0, 0, 0, 0',
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
      value: 'FUNC_ADD',
      help: `
      Blend equation for RGB.

${blendEquationSnippet}
      `,
    },
    {
      pname: 'BLEND_EQUATION_ALPHA',
      value: 'FUNC_ADD',
      help: `
      Blend equation for alpha  .

${blendEquationSnippet}
      `,
    },
];

const polygonState = [
    {
      pname: 'CULL_FACE',
      value: 'false',
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
      value: 'BACK',
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
      value: 'CCW',
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
      value: '0',
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
      value: '0',
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
      value: '0, 0, 0, 0',
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
      value: '1',
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
      value: '0xFF',
      help: `
      the value to clear the depth buffer to when calling --gl.clear--
      with the --gl.STENCIL_BUFFER_BIT-- set

      ---js
      gl.clearStencil(0xFF);
      ---
      `,
    },
];

const miscState = [
    {
      pname: 'COLOR_WRITEMASK',
      value: 'true, true, true, true',
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
      pname: 'VIEWPORT',
      value: '0, 0, 300, 150',
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
      pname: 'SCISSOR_TEST',
      value: 'false',
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
      value: '0, 0, 0, 0',
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
      value: '4',
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
      value: '4',
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

function createBufferDisplay(parent, name, webglObject) {
  const bufElem = createTemplate(parent, '#buffer-template');
  setName(bufElem, name);
  makeDraggable(bufElem);
  return bufElem;
}

function createTextureDisplay(parent, name, webglObject, imgHref) {
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

  const texState = [
   {
      pname: 'WRAP_S',
      value: 'REPEAT',
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
      pname: 'WRAP_T',
      value: 'REPEAT',
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
      pname: 'MIN_FILTER',
      value: 'LINEAR_MIPMAP_NEAREST',
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
      pname: 'MAG_FILTER',
      value: 'LINEAR',
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

  createStateTable(texState, texElem, 'texture state');
  makeDraggable(texElem);
  return texElem;
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
  return expander;
}

function expand(elem) {
  if (elem.classList.contains('expander')) {
    elem.classList.add('open');
  } else {
    elem.querySelector('.expander').classList.add('open');
  }
}

const diagramElem = document.querySelector('#diagram');
const codeElem = document.querySelector('#code');

const globalState = document.querySelector('#global-state');
expand(createTextureUnits(globalState, 8));
expand(createStateTable(clearState, globalState, 'clear state'));
expand(createStateTable(depthState, globalState, 'depth state'));
createStateTable(blendState, globalState, 'blend state');
createStateTable(miscState, globalState, 'misc state');
createStateTable(stencilState, globalState, 'stencil state');
createStateTable(polygonState, globalState, 'polygon state');
makeDraggable(globalState, 10, 10);
makeDraggable(document.querySelector('#canvas'), -10, 10);

let currentLine;
let unknownId = 0;
const webglObjects = new Map();
const nameRE = /\s+(\w+)\s*=\s*\w+\.create\w+/;

function wrapFn(fnName, fn) {
  WebGLRenderingContext.prototype[fnName] = function(origFn) {
    return function(...args) {
      return fn.call(this, origFn, ...args);
    };
  }(WebGLRenderingContext.prototype[fnName]);
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
wrapCreationFn('createTexture', (name, webglObject) => {
  return createTextureDisplay(diagramElem, name, webglObject, '/webgl/resources/f-texture.png')
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
wrapFn('shaderSource', function(origFn, shader, source) {
  origFn.call(this, shader, source);
  // TODO: handle one already attached
  const {ui} = webglObjects.get(shader);
  const expander = createExpander(ui, 'source');
  const preElem = addElem('pre', expander);
  const codeElem = addElem('code', preElem, {className: 'lang-glsl'});
  codeElem.textContent = source;
  hljs.highlightBlock(codeElem);
  expand(expander);
});

wrapFn('attachShader', function(origFn, program, shader) {
  origFn.call(this, program, shader);
  // TODO: handle one already attached
  const {ui} = webglObjects.get(program);
  const type = gl.getShaderParameter(shader, gl.SHADER_TYPE) === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
//  createShaderDisplay(ui, type, gl.getShaderSource(shader));
});

wrapFn('linkProgram', function(origFn, program) {
  origFn.call(this, program);
  // TODO: check for success

  const {ui} = webglObjects.get(program);
  const attribExpander = createExpander(ui, 'attribute info', {
    dataset: {
      hint: 'attributes are user defined. Their values come from buffers as specified in a *vertex array*.',
    },
  });
  const uniformExpander = createExpander(ui, 'uniforms', {
    dataset: {
      hint: 'uniform values are user defined program state. The locations and values are different for each program.',
    },
  });

  createProgramAttributes(attribExpander, gl, program);
  createProgramUniforms(uniformExpander, gl, program);

  expand(attribExpander);
  expand(uniformExpander);

});

const js = document.querySelector('#js').text;
const lines = [...js.matchAll(/[^`;]*(?:`[^`]*?`)?[^`;]*;?;\n/g)].map(m => {
  const code = m[0];
  const elem = document.createElement('pre');
  elem.textContent = code;
  codeElem.appendChild(elem);
  return {
    code,
    elem,
  };
});
for (const {code} of lines) {
  currentLine = code;
  eval(code.replace(/const |let /g, ''));
}

//const tx = createTextureDisplay(diagramElem, '/webgl/resources/f-texture.png');

createVertexArrayDisplay(diagramElem, [
  {size: 2, type: 'FLOAT', buffer: 'texcoordBuffer',},
  {size: 3, type: 'FLOAT', buffer: 'normalBuffer',},
  {size: 3, type: 'FLOAT', buffer: 'positionBuffer',},
]);

//createProgramDisplay(diagramElem, gl, prg);
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