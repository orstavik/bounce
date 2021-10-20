//<template> doesn't work, but if it did, we would need to do this:
// const testHtml = Array.from(template.content.childNodes).map(n => n.outerHTML || n.textContent).join('');
let counter = 0;

import {RubiksCube} from "./RubiksCube.js";
import {RubiksCube2} from "./RubiksCube2.js";

class CbSeq extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = '<slot style="display: block; overflow: hidden; height: 0; width: 0;"></slot><div></div>';
    this.shadowRoot.addEventListener('slotchange', e => this.slotchange(e));
  }

  slotchange(e) {
    const div = this.shadowRoot.children[1];
    let json = this.innerText.trim();
    if (!json)
      return div.innerHTML = '';
    this.shadowRoot.children[1].innerHTML = JSON.parse(json).map(({name, el}) => `<span name='${name}' el='${el}'>${name}</span>`).join('\n');
  }
}

customElements.define('cb-seq', CbSeq);

class CbTable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = '<slot style="display: block; overflow: hidden; height: 0; width: 0;"></slot><div></div>';
    this.shadowRoot.addEventListener('slotchange', e => this.slotchange(e));
  }

  slotchange(e) {
    const div = this.shadowRoot.children[1];
    let json = this.innerText.trim();
    if (!json)
      return div.innerHTML = '';
    this.shadowRoot.children[1].innerHTML = JSON.parse(json).map(({name, el}) => `<span name='${name}' el='${el}'>${name}</span>`).join('\n');
  }
}

customElements.define('cb-table', CbTable);

export class TestHtml extends HTMLElement {
  #id;

  constructor() {
    super();
    this.#id = counter++;
    this.attachShadow({mode: "open"});
    this.shadowRoot.addEventListener('slotchange', e => this.slotchange(e));
    this.shadowRoot.innerHTML = `<slot hidden></slot><iframe hidden></iframe><div></div>`;
    window.addEventListener('message', e => this.message(e));
  }

  message(e) {
    let res = JSON.parse(e.data);
    res instanceof Object && (res = res[this.#id]);
    if (!res)
      return;

    //the table. List the values for each callback.
    //lines. List values for only selected properties.
    //line 1. List values for one callback
    //      <rubiks-cube2>${JSON.stringify(res)}</rubiks-cube2>
    this.shadowRoot.children[2].innerHTML = `
      <rubiks-cube >${JSON.stringify(res)}</rubiks-cube>
      <row-column hidden>${JSON.stringify(res)}</row-column>
      <cb-seq >${JSON.stringify(res.map(({name, el})=>({name, el})))}</cb-seq>
   `;
  }

  slotchange(e) {
    const slotted = this.shadowRoot.children[0].assignedElements();
    if (!slotted.length)
      return this.shadowRoot.children[2].innerHTML = "", this.shadowRoot.children[1].src = "";
    if (slotted.length > 1 || slotted[0].tagName !== 'NOSCRIPT')
      throw new Error('TestHtml can only contain a single <noscript></noscript> element.');

    this.shadowRoot.children[1].src =
      `data:text/html;charset=utf-8,${encodeURI(`<base href='${document.location.href}'/>${slotted[0].innerHTML}`)}#${this.#id}`;
  }
}