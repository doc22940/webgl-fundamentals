/* eslint strict: "off" */
/* eslint no-undef: "error" */

/* global evalHelper, hljs */

import { addElem, wait } from './webgl-state-diagram-utils.js';

export default class Stepper {
  constructor() {
    this.unknownId = 0;
    this.currentLine = '';
    this.nameRE = /\s+(\w+)\s*=\s*\w+\.create\w+/;
  }
  init(codeElem, js) {
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
  guessIdentifierOfCurrentLine() {
    const m = this.nameRE.exec(this.currentLine.trim());
    return m ? m[1] : `-unknown${++this.unknownId}-`;
  }
}
