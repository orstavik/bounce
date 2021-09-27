class TestHtml extends HTMLElement {
  #id;
  #div;
  #slot;
  #iframe;
  #count = 0;

  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.addEventListener('slotchange', e => this.slotchange(e));
    this.shadowRoot.innerHTML = `
<slot></slot>
<iframe hidden></iframe>
<div table>
  <div name class="${this.id}">${this.id}<div id="code"></div></div>
  <div data></div>
</div>
<link rel="stylesheet" href="test.css">`;
    this.#id = this.id.replaceAll(' ', '');
    this.#slot = this.shadowRoot.children[0];
    this.#iframe = this.shadowRoot.children[1];
    this.#div = this.shadowRoot.children[2].children[1];
    window.addEventListener('message', e => this.onMessage(e));
  }

  onMessage(e) {
    let res = JSON.parse(e.data);
    if (res instanceof Array && res[0] === this.#id + '')
      this.render(res[1]);
  }

  render(res) {
    const truth = Object.entries(res).filter(([k, v]) => v && k).map(([k, v]) => k);
    const row = Object.entries(res).map(([k, v]) => `<div class="${k}" value="${v}" title="${k}"> </div>`).join('\n');
    this.#div.insertAdjacentHTML('beforeend', `<div class="row row${this.#count++} ${truth.join(' ')}">${row}</div>`);
  }

  slotchange(e) {
    const slotted = this.#slot.assignedElements();
    if (!slotted.length) return this.#div.innerHTML = this.#iframe.src = "";
    if (slotted.length > 1 || slotted[0].tagName !== 'NOSCRIPT')
      throw new Error('TestHtml can only contain a single <noscript></noscript> element.');
    this.runTest();
  }

  runTest() {
    this.#div.innerHTML = '';
    const slotted = this.#slot.assignedElements();
    const context = this.hasAttribute('context') ?'<script src="window_constructionContext.js"></script>':'';
    const legal =this.hasAttribute('legal') ? '<script src="window_legalConstruction.js"></script>':'';
    const testTxt = slotted[0].innerHTML.trim();
    const txt = `<base href='${document.location.href}'/><script src='log.js'></script>${context}${legal}${testTxt}`;
    this.shadowRoot.getElementById('code').innerText = testTxt;
    this.#iframe.src = `data:text/html;charset=utf-8,${encodeURI(txt)}#${this.#id}`;
  }

  attributeChangedCallback(){
    this.runTest();
  }

  static get observedAttributes(){
    return ['legal', 'context'];
  }
}

customElements.define('test-html', TestHtml);