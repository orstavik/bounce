//Tabbables depend on Focusable

//this function finds the next tabbable within the same document
function nextTabbableInDocument(contextRoot, notHigherThanThisNumber, notBeforeThisNode) {
  const treeWalker = Document.createTreeWalker(
    contextRoot,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: function (node) {
        const ti = node.tabIndex;
        if (ti === undefined || ti < 0)
          return NodeFilter.FILTER_SKIP;
        if(ti > notHigherThanThisNumber)
          return NodeFilter.FILTER_SKIP;
        if(ti === notHigherThanThisNumber && node.compareDocumentPosition(notBeforeThisNode) & Node.DOCUMENT_POSITION_FOLLOWING) //todo check this
          return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      }
    },
    false
  );
  let temp;
  for (let next = treeWalker.nextNode(); next; next = treeWalker.nextNode()) {
    if(!temp || temp.tabIndex < next.tabIndex)
      temp = next;
  }
  return temp;
}

function* nextShadowRoot(node) {
  if (node instanceof HTMLElement && node.tagName.indexOf('-') > 0)
    yield node.shadowRoot;
  for (let child of node.children) {
    for (let nestedShadow of nextShadowRoot(child))
      yield nestedShadow;
  }
}

//this function finds the next tabbable between different documents.
function nextTabbable(node) {
  //1. if the node with focus is a custom element with a shadowRoot, then tab into that shadowRoot first.
  let next;
  if (node instanceof HTMLElement && node.tagName.indexOf('-') > 0)
    next = nextTabbableInDocument(node.shadowRoot, Number.MAX_SAFE_INTEGER, node.shadowRoot);
  if (next)
    return next;
  //2. else, if there is a next tabbable in the same document, then tab to that one
  const rootNode = node.getRootNode();
  const documentTabbable = nextTabbableInDocument(rootNode, node.tabIndex, node);
  if(documentTabbable)
    return documentTabbable;
  //3. else, check all the shadowRoots of custom elements in the document to see if there are a next tabbable inside one of them.
  for (let shadow of nextShadowRoot(node)) {
    const shadowRootTabbable = nextTabbableInDocument(shadow, Number.MAX_SAFE_INTEGER, shadow);
    if(shadowRootTabbable)
      return shadowRootTabbable;
  }
  //4. finally, pass the control to the lightDom, or, if the document has been exhausted, flip the script and start from scratch.
  if (rootNode instanceof DocumentFragment)
    return nextTabbable(rootNode.host);
  else if (rootNode === document)
    return nextTabbable(document, Number.MAX_SAFE_INTEGER);
  throw new Error("omg, this shouldn't be possible.");
}

function onKeydown(e) {
  if (e.key !== "Tab")
    return;
  e.preventDefault();
  const nextTabbable = nextTabbable(document.activeElement);
  nextTabbable.focus();
  // setTimeout(()=>focusTarget.focus()); //should we do this? it feels right..
}


//1. This ElementMixin is added to the elements that should be able to react to Tab keydown events.
//   Likely, you would want to add the ElementMixin to the <html> element for efficiency.
//   But, it can also be added to all the Element types that can receive keydown events.
//   You need to add such a Receiver to the lowest element, if there are other default actions
//   that might be added to the same event. But keypress/keydown "tab" is by convention "reserved" event for just
//   this action.
export class TabbableReceiver extends HTMLElement{
  connectedCallback() {
    this.shadowRoot.addEventListener("keydown", onKeydown, {
      preventable: EventListenerOptions.PREVENTABLE_SOFT,
      trustedOnly: true
    });
  }

  disconnectedCallback() {
    this.shadowRoot.removeEventListener("keydown", onKeydown);
  }
}

//todo find out which integer values are valid here today.
function calculateTabIndex(el, defaultTabIndex) {
  const val = el.getAttribute('tabindex');
  if (!val || !Number.isInteger(val)) return defaultTabIndex;
  return Number.parseInt(val);
}

//The difference between AlwaysTabbable vs. SometimesTabbable is tabIndex defaulting to 0 vs. -1.
export class AlwaysTabbable extends HTMLElement {

  get tabIndex() {
    return calculateTabIndex(this, 0);
  }
}

export class SometimesTabbable extends HTMLElement {

  get tabIndex() {
    return calculateTabIndex(this, -1);
  }
}