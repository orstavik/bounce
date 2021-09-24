export class TestHtml extends HTMLElement {
  #id;
  #div;
  #slot;
  #iframe;

  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.addEventListener('slotchange', e => this.slotchange(e));
    this.shadowRoot.innerHTML = `<slot></slot><iframe hidden></iframe><div table></div><link rel="stylesheet" href="test.css">`;
    this.#id = this.id.replaceAll(' ', '');
    this.#slot = this.shadowRoot.children[0];
    this.#iframe = this.shadowRoot.children[1];
    this.#div = this.shadowRoot.children[2];
    window.addEventListener('message', e => this.onMessage(e));
  }

  onMessage(e) {
    let res = JSON.parse(e.data);
    if (res instanceof Array && res[0] === this.#id + '')
      this.render(res[1]);
  }

  render(res) {
    const row = Object.entries(res).map(([k, v]) => `<div class="${k}" value="${v}" title="${k}"> </div>`).join('\n');
    this.#div.children[1].insertAdjacentHTML('beforeend', `<div row>${row}</div>`);
  }

  slotchange(e) {
    this.#div.innerHTML = this.#iframe.src = "";
    const slotted = this.#slot.assignedElements();
    if (!slotted.length) return;
    if (slotted.length > 1 || slotted[0].tagName !== 'NOSCRIPT')
      throw new Error('TestHtml can only contain a single <noscript></noscript> element.');

    const txt = `
<base href='${document.location.href}'/>
<script src='log.js'></script>
<script src="window_constructionContext.js"></script>
<script src="window_legalConstruction.js"></script>
${slotted[0].innerHTML}`;
    this.#div.insertAdjacentHTML('afterbegin', `<div name class="${this.id}">${this.id}</div><div data></div>`);
    this.#iframe.src = `data:text/html;charset=utf-8,${encodeURI(`${txt}`)}#${this.#id}`;
  }
}