/* eslint strict: "off" */
/* eslint no-undef: "error" */

/* global evalHelper, hljs */

import { addElem, wait } from './webgl-state-diagram-utils.js';

function noop() {}

export default class Stepper {
  constructor() {
    this.unknownId = 0;
    this.currentLine = '';
    this.nameRE = /\s+(\w+)\s*=\s*\w+\.create\w+/;
  }

  init(codeElem, js, options) {
    const {onAfter = noop} = options;
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

    const execute = (code) => {
      this.currentLine = code;
      evalHelper(code.replace(/const |let /g, ''));
    };

    function step() {
      lines[currentLineNo].elem.classList.remove('current-line');
      execute(lines[currentLineNo++].code);
      highlightCurrentLine();
      onAfter();
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

    async function run() {
      while (currentLineNo < lines.length) {
        step();
        await wait(50);
      }
    }
  }
  // WebGLObjects don't have names and there really isn't a good way
  // to give them a name. This hack assumes the line calling `gl.createXXX`
  // is in the form of `someVar = gl.createXXX` in which case it will
  // name the object `someVar`.
  //
  // Of course it won't handle
  //
  //     const foo = {
  //       tex: gl.createTexture();
  //     };
  //
  // In which case we'd probably want to name it 'foo' or 'foo.tex'.
  //
  // It also won't work with
  //
  //     function makeTex() {
  //       const t = gl.createTexture();
  //       return t;
  //     }
  //
  //     const checker = makeTex();
  //
  // In which case we'd arguably want it to be 'checker' but
  // it would be 't' with the current code.
  //
  // There is really no way to fix this except to ask the user
  // to give the object a name via some API but that would make the
  // example non-standard.
  //
  // This is also why there is no helper for compiling shaders in
  // the example code though for our example we could hack this
  // to look for `someShader = compileShaderHelper(...)`
  //
  guessIdentifierOfCurrentLine() {
    const m = this.nameRE.exec(this.currentLine.trim());
    return m ? m[1] : `-unknown${++this.unknownId}-`;
  }
}
