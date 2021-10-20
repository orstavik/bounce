//language=CSS
const style = `
  :host([ok="true"]) {
    background: green;
  }
  :host([ok="false"]) {
    background: red;
  }
`;

class TestHtml extends HTMLElement {
  #result;
  #iframe;
  #id;

  static #count = 0;

  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = `<style>${style}</style><iframe></iframe>`;
    this.#iframe = this.shadowRoot.childNodes[1];
    this.#id = TestHtml.#count++;
    this.#result = [];
    window.addEventListener('message', e => this.onMessage(e));
  }

  onMessage(e) {
    let res = JSON.parse(e.data);
    if (!(res instanceof Array) || res[0] !== this.#id + '')
      return;
    this.#result.push(res[1]);
    this.render();
  }

  render() {
    this.setAttribute('result', JSON.stringify(this.#result));
    this.setAttribute('ok', this.getAttribute('expected') === this.getAttribute('result'));
  }

  async attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'test') {
      //load the text content for the newValue of the test.
      const testUrl = new URL(newValue, document.location);
      const logUrl = new URL('log.js', document.location);
      const response = await fetch(testUrl);
      const testTxt = await response.text();
      this.setAttribute('code', testTxt);
      const txt = `<base href='${testUrl}'/><script src='${logUrl}'></script>${testTxt}`;
      this.#iframe.src = `data:text/html;charset=utf-8,${encodeURI(txt)}#${this.#id}`;
    }
  }

  static get observedAttributes() {
    return ['test'];
  }
}

customElements.define('test-html', TestHtml);