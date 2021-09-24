function printLabel(element) {
  return `
<div class="row label">
    <div name></div>
    ${Object.entries(element).map(([k, v]) => `
      <div key="${k}">${k}</div>
    `).join('\n')}
</div>`;
}

function toRowHtml(name, element) {
  return `
<div class="row">
    <div name class="${name}">${name}</div>
    ${Object.entries(element).map(([k, v]) => `
      <div key="${k}" value="${v}"> </div>
    `).join('\n')}
</div>`;
}

export class TestHtml extends HTMLElement {
  #id;

  constructor() {
    super();
    this.#id = this.id.replaceAll(' ', '');
    this.attachShadow({mode: "open"});
    this.shadowRoot.addEventListener('slotchange', e => this.slotchange(e));
    this.shadowRoot.innerHTML = `<slot></slot><iframe hidden></iframe><div></div><link rel="stylesheet" href="test.css">`;
    window.addEventListener('message', e => this.message(e));
  }

  message(e) {
    let res = JSON.parse(e.data);
    if (!(res instanceof Array && res[0] === this.#id + ''))
      return;
    res = res[1].pop();
    delete res.el;
    this.shadowRoot.children[2].innerHTML =`
${this.hasAttribute('show-labels') ? printLabel(res) : ''}
${toRowHtml(this.id, res)}
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
    this.shadowRoot.children[2].innerHTML = `
${toRowHtml(this.id, {"hasParentNode":false,"hasAttributes":false,"hasChildNodes":false,"isConnected":false,"isLoading":false,"isCurrentScript":false,"isEventListener":false,"currentElementIsLastElement":false,"currentScriptIsLastElement":false,"syncUpgrade":false,"predictive":false,"NEW":false})}
`;
  }
}