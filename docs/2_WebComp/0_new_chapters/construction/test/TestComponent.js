//language=HTML
const template = `
  <style>
    :host([ok="true"]) {
      border-left: 5px solid green;
    }
    :host([ok="false"]) {
      border-left: 5px solid red;
    }
    :host {
      display: block;
      /*width: 100px;*/
      height: 50px;
      overflow: hidden;
    }
    :host([active]) {
      width: 90vw;
      height: 90vh;
    }
    pre {
      border: 2px dashed grey;
    }
  </style>
  <h3></h3>
  <pre id="code"></pre>
  <pre id="expected"></pre>
  <pre id="result"></pre>
  <pre id="diff"></pre>
  <iframe></iframe>
`;

import {} from "https://unpkg.com/diff@5.0.0/dist/diff.js";

class TestHtml extends HTMLElement {

  static #count = 0;

  #resultObj = [];
  #iframe;
  #id = TestHtml.#count++;
  #result;
  #code;
  #expected;
  #diff;
  #expectedShadow;
  #title;

  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = template;
    this.#expected = this.children[0];
    this.#expectedShadow = this.shadowRoot.querySelector("#expected");
    this.#title = this.shadowRoot.querySelector("h3");
    this.#result = this.shadowRoot.querySelector("#result");
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
    this.#expectedShadow.textContent = this.#expected.textContent;
    this.#result.textContent = JSON.stringify(this.#resultObj, null, 3);
    const expect = JSON.stringify(JSON.parse(this.#expected.textContent), null, 3);
    this.setAttribute('ok', expect === this.#result.textContent);
  }

  onClick() {
    this.hasAttribute('active') ? this.removeAttribute('active') : this.setAttribute('active', '');
  }

  async attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'test') {
      //load the text content for the newValue of the test.
      this.#title.textContent = newValue.substr(newValue.lastIndexOf('/') + 1);
      const testUrl = new URL(newValue, document.location);
      const logUrl = new URL('log.js', document.location);
      const response = await fetch(testUrl);
      const testTxt = await response.text();
      this.#code.textContent = testTxt;
      const txt = `<base href='${testUrl}'/><script src='${logUrl}'></script>${testTxt}`;
      const data = encodeURI(txt);
      console.log(newValue, data.length)
      // debugger
      this.#iframe.src = `data:text/html;charset=utf-8,${data}#${this.#id}`;
    } else if (name === 'active' && newValue) {
      this.#diff.textContent = Diff.diffWords(this.#expected.textContent, this.#result.textContent);
    }
  }

  static get observedAttributes() {
    return ['test', 'active'];
  }
}

customElements.define('test-html', TestHtml);