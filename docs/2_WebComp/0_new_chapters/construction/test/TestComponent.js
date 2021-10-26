//language=HTML
const template = `
  <style>
    :host { display: block; height: 1em; overflow: hidden; }
    :host([ok="true"]) { border-left: 5px solid green; }
    :host([ok="false"]) { border-left: 5px solid red; }
    :host([active]) { height: 60vh; overflow: scroll; }
    #diff { white-space: pre; }
  </style>
  <span id="title"></span>
  <a id="link" target="_blank"> => run test in isolation </a>
  <div id="diff"></div>
  <pre id="code"></pre>
  <iframe></iframe>
`;

import {} from "https://unpkg.com/diff@5.0.0/dist/diff.js";

class TestHtml extends HTMLElement {

  static #count = 0;

  #resultObj = [];
  #iframe;
  #id = TestHtml.#count++;
  #code;
  #expected;
  #diff;
  #title;
  #link;

  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = template;
    this.#expected = this.children[0];
    this.#title = this.shadowRoot.querySelector("#title");
    this.#link = this.shadowRoot.querySelector("#link");
    this.#code = this.shadowRoot.querySelector("#code");
    this.#diff = this.shadowRoot.querySelector("#diff");
    this.#iframe = this.shadowRoot.querySelector("iframe");
    window.addEventListener('message', e => this.onMessage(e));
    this.shadowRoot.addEventListener('click', e => this.onClick(e));
  }

  onMessage(e) {
    let res = JSON.parse(e.data);
    if (!(res instanceof Array) || res[0] !== this.#id + '')
      return;
    this.#resultObj.push(res[1]);
    this.render();
  }

  render() {
    const result = JSON.stringify(this.#resultObj, null, 3);
    const expected = JSON.stringify(JSON.parse(this.#expected.textContent), null, 3);
    this.setAttribute('ok', expected === result);
  }

  onClick() {
    this.hasAttribute('active') ? this.removeAttribute('active') : this.setAttribute('active', '');
  }

  async attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'test') {
      //load the text content for the newValue of the test.
      this.#title.textContent = newValue.substr(newValue.lastIndexOf('/') + 1);
      const testUrl = new URL(newValue, document.location);
      this.#link.setAttribute('href', testUrl);
      const logUrl = new URL('log.js', document.location);
      const response = await fetch(testUrl);
      const testTxt = await response.text();
      this.#code.textContent = testTxt;
      const txt = `<base href='${testUrl}'/><script src='${logUrl}'></script>${testTxt}`;
      const data = encodeURI(txt);
      this.#iframe.src = `data:text/html;charset=utf-8,${data}#${this.#id}`;
    } else if (name === 'active' && (typeof newValue) === 'string') {
      const result = JSON.stringify(this.#resultObj, null, 2);
      const expected = JSON.stringify(JSON.parse(this.#expected.textContent), null, 2);
      const diff = Diff.diffWords(expected, result);
      const diffTxt = diff.map(p => `<span style="color: ${p.added ? 'green' : p.removed ? 'red' : 'grey'}">${p.value}</span>`).join('');
      this.#diff.innerHTML = diffTxt;
    }
  }

  static get observedAttributes() {
    return ['test', 'active'];
  }
}

customElements.define('test-html', TestHtml);