//language=HTML
const template = `
  <style>
    :host([ok="true"]) {
      background: green;
    }
    :host([ok="false"]) {
      background: red;
    }
    :host {
      display: block;
      width: 100px;
      height: 100px;
      overflow: scroll;
    }
  </style>
  <pre id="result"></pre>
  <pre id="code"></pre>
  <iframe></iframe>
`;

class TestHtml extends HTMLElement {

  static #count = 0;

  #resultObj = [];
  #iframe;
  #id = TestHtml.#count++;
  #result;
  #code;
  #expected;

  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = template;
    this.#expected = this.children[0];
    this.#result = this.shadowRoot.querySelector("#result");
    this.#code = this.shadowRoot.querySelector("#code");
    this.#iframe = this.shadowRoot.querySelector("iframe");
    window.addEventListener('message', e => this.onMessage(e));
  }

  onMessage(e) {
    let res = JSON.parse(e.data);
    if (!(res instanceof Array) || res[0] !== this.#id + '')
      return;
    this.#resultObj.push(res[1]);
    this.render();
  }

  render() {
    this.#result.textContent = JSON.stringify(this.#resultObj, null, 3);
    const expect = JSON.stringify(JSON.parse(this.#expected.textContent), null, 3);
    this.setAttribute('ok', expect === this.#result.textContent);
  }

  async attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'test') {
      //load the text content for the newValue of the test.
      const testUrl = new URL(newValue, document.location);
      const logUrl = new URL('log.js', document.location);
      const response = await fetch(testUrl);
      const testTxt = await response.text();
      this.#code.textContent = testTxt;
      const txt = `<base href='${testUrl}'/><script src='${logUrl}'></script>${testTxt}`;
      this.#iframe.src = `data:text/html;charset=utf-8,${encodeURI(txt)}#${this.#id}`;
    }
  }

  static get observedAttributes() {
    return ['test'];
  }
}

setTimeout(_=>customElements.define('test-html', TestHtml));