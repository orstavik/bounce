# WhatIs: the *sequence* and *context* of `HTMLElement` construction?

In this article we will set up a series of contexts for `HTMLElement` construction, and look at the sequence and context for these processes. As will become evident, these vary significantly and can cause serious confusion for web developers trying to make ***reusable*** web components that potentially could be *constructed* from all of these angles.

## Predictive parser 1: empty `HTMLElement`

```html
<script src="./WebComp.js"></script>
<web-comp></web-comp>
```

## Predictive parser 2: `HTMLElement` with `attributes` and slottable `childNodes`

```html
<script src="./WebComp.js"></script>
<web-comp a="a" b="b">hello sunshine</web-comp>
```

## Predictive parser 3: `HTMLElement` with `attributes` and non-slottable `childNodes`

```html
<script src="./WebComp.js"></script>
<web-comp a="a" b="b"><h1 slot="oops">hello sunshine</h1></web-comp>
```

## Predictive parser 4: illustrate `childNodes`

```html
<script src="./WebComp.js"></script>
<web-comp a="a" b="b">
  hello 
  <script>log('2/3 child')</script>
  sunshine
</web-comp>
<script>log('sibling')</script>
```

## Upgrade 1: empty element

```html
<web-comp></web-comp>
<script src="./WebComp.js"></script>
```

## Upgrade 2: empty element

```html
<web-comp a="a">hello sunshine</web-comp>
<script src="./WebComp.js"></script>
```

## Upgrade 3: upgrade from within

```html
<web-comp a="a" b="b">
  hello
  <script src="./WebComp.js"></script>
  sunshine
</web-comp>
```

## innerHTML: empty and not connected

```html
<script src="./WebComp.js"></script>
<script>
  const div = document.createElement('web-comp');
  div.innerHTML = '<web-comp></web-comp>';
</script>
```

## insertAdjacentHTML: empty and not connected

should be identical to innerHTML.

```html
<script src="./WebComp.js"></script>
<script>
  const div = document.createElement('web-comp');
  div.insertAdjacentHTML('afterbegin', '<web-comp></web-comp>');
</script>
```

## innerHTML: connected with `attributes` and `childNodes`

```html
<script src="./WebComp.js"></script>
<script>
  const div = document.createElement('web-comp');
  div.innerHTML = '<web-comp a="a" b="b">hello sunshine</web-comp>';
</script>
```

## innerHTML: connected with `attributes` and `childNodes`

```html
<script src="./WebComp.js"></script>
<script>
  const div = document.createElement('web-comp');
  div.innerHTML = 
	  `<web-comp a="a" b="b">
	     hello
	     <web-comp a="1" b="2">sunshine</web-comp>
	   </web-comp>`;
</script>
```


returns:

| |constructor|constructor micro|attributeChanged|connected|slotchange|2/3 child|sibling|
|---|---|---|---|---|---|---|---|
|hasParentNode| | | |1|1|1|1|
|isConnected| | | |1|1|1|1|
|isLoading|1|1|1|1|1|1|1|
|currentScript| | | | | |SCRIPT|SCRIPT|
|isEventListener| | | | | | | |
|attributes| | |2|2|2|2|2|
|childNodes| | | | |3|2|3|
|lastElementInDocument|#text|#text|#text|WEB-COMP|#text|#text|#text|
|currentElementIsLastElement| | | |1| | | |
|currentScriptIsLastElement| | | | | | | |
|syncUpgrade| | | | | | | |

returns:

| |constructor|constructor micro|attributeChanged|connected|slotchange|
|---|---|---|---|---|---|
|hasParentNode|0|0|0|1|1|
|isConnected|0|0|0|1|1|
|isLoading|1|1|1|1|1|
|currentScript|0|0|0|0|0|
|isEventListener|0|0|0|0|0|
|hasAttributesOrChildNodes|0|0|1|1|1|
|lastElementInDocument|#text|#text|#text|WEB-COMP|#text|
|currentElementIsLastElement|0|0|0|1|0|
|currentScriptIsLastElement|0|0|0|0|0|
|syncUpgrade|0|0|0|0|0|

## When: are `attributes` and `childNodes` set?

The predictive parser will:
1. *always* call `connectedCallback()`, and
2. *always* call `attributeChangedCallback()` *before* `connectedCallback()`, when it sets any attributes on the element.
3. this means that there are `attributes`
The `attributes` are populated *after* the `constructor()` *and* any micro-task triggered by the  

|------#predictiveEmpty------|

| |constructor|constructor micro|connected|
|---|---|---|---|
|hasParentNode| | |1|
|isConnected| | |1|
|isLoading|1|1|1|
|currentScript| | | |
|isEventListener| | | |
|attributes| | | |
|childNodes| | | |
|lastElementInDocument| | | |
|currentElementIsLastElement| | |1|
|currentScriptIsLastElement| | | |
|syncUpgrade| | | |
|------#predictive------|
| |constructor|constructor micro|attributeChanged|connected|slotchange|
|---|---|---|---|---|---|
|hasParentNode| | | |1|1|
|isConnected| | | |1|1|
|isLoading|1|1|1|1| |
|currentScript| | | | | |
|isEventListener| | | | | |
|attributes| | |2|2|2|
|childNodes| | | | |1|
|lastElementInDocument| | | | | |
|currentElementIsLastElement| | | |1| |
|currentScriptIsLastElement| | | | | |
|syncUpgrade| | | | | |
|------#predictiveNonSlottable------|
| |constructor|constructor micro|attributeChanged|connected|
|---|---|---|---|---|
|hasParentNode| | | |1|
|isConnected| | | |1|
|isLoading|1|1|1|1|
|currentScript| | | | |
|isEventListener| | | | |
|attributes| | |2|2|
|childNodes| | | | |
|lastElementInDocument| | | | |
|currentElementIsLastElement| | | |1|
|currentScriptIsLastElement| | | | |
|syncUpgrade| | | | |
|------#upgradeEmpty------|
| |constructor|connected|constructor micro|
|---|---|---|---|
|hasParentNode|1|1|1|
|isConnected|1|1|1|
|isLoading|1|1|1|
|currentScript| | | |
|isEventListener| | | |
|attributes| | | |
|childNodes| | | |
|lastElementInDocument| | | |
|currentElementIsLastElement| | | |
|currentScriptIsLastElement|1|1|1|
|syncUpgrade| | | |
|------#predictive childIllustration------|
| |constructor|constructor micro|attributeChanged|connected|slotchange|2/3 child|slotchange|sibling|
|---|---|---|---|---|---|---|---|---|
|hasParentNode| | | |1|1|1|1|1|
|isConnected| | | |1|1|1|1|1|
|isLoading|1|1|1|1|1|1|1|1|
|currentScript| | | | | | | | |
|isEventListener| | | | | | | | |
|attributes| | |2|2|2|2|2|2|
|childNodes| | | | |2|2|3|3|
|lastElementInDocument| | | | | | | | |
|currentElementIsLastElement| | | |1| | | | |
|currentScriptIsLastElement| | | | | | | | |
|syncUpgrade| | | | | | | | |
|------#upgradeWithin------|
| |constructor|attributeChanged|connected|slotchange|constructor micro|slotchange|
|---|---|---|---|---|---|---|
|hasParentNode|1|1|1|1|1|1|
|isConnected|1|1|1|1|1|1|
|isLoading|1|1|1|1|1| |
|currentScript| | | | | | |
|isEventListener| | | | | | |
|attributes|2|2|2|2|2|2|
|childNodes|2|2|2|2|2|3|
|lastElementInDocument| | | | | | |
|currentElementIsLastElement| | | | | | |
|currentScriptIsLastElement|1|1|1|1|1| |
|syncUpgrade| | | | | | |
|------#upgrade------|
| |constructor|attributeChanged|connected|slotchange|constructor micro|
|---|---|---|---|---|---|
|hasParentNode|1|1|1|1|1|
|isConnected|1|1|1|1|1|
|isLoading|1|1|1|1|1|
|currentScript| | | | | |
|isEventListener| | | | | |
|attributes|2|2|2|2|2|
|childNodes|3|3|3|3|3|
|lastElementInDocument| | | | | |
|currentElementIsLastElement| | | | | |
|currentScriptIsLastElement|1|1|1|1|1|
|syncUpgrade| | | | | |
|------#insertAdjacentHTML------|
| |constructor|constructor micro|
|---|---|---|
|hasParentNode|1|1|
|isConnected| | |
|isLoading|1|1|
|currentScript| | |
|isEventListener| | |
|attributes| | |
|childNodes| | |
|lastElementInDocument| | |
|currentElementIsLastElement| | |
|currentScriptIsLastElement| | |
|syncUpgrade| | |
|------#innerHTMLemptyDisconnect------|
| |constructor|constructor micro|
|---|---|---|
|hasParentNode|1|1|
|isConnected| | |
|isLoading|1|1|
|currentScript| | |
|isEventListener| | |
|attributes| | |
|childNodes| | |
|lastElementInDocument| | |
|currentElementIsLastElement| | |
|currentScriptIsLastElement| | |
|syncUpgrade| | |
|------#innerHTMLattributesChildren------|
| |constructor|attributeChanged|slotchange|constructor micro|
|---|---|---|---|---|
|hasParentNode|1|1|1|1|
|isConnected| | | | |
|isLoading|1|1|1|1|
|currentScript| | | | |
|isEventListener| | | | |
|attributes|2|2|2|2|
|childNodes|1|1|1|1|
|lastElementInDocument| | | | |
|currentElementIsLastElement| | | | |
|currentScriptIsLastElement| | | | |
|syncUpgrade| | | | |
|------#innerHTMLnested------|
| |constructor|attributeChanged|constructor|attributeChanged|slotchange|slotchange|constructor micro|constructor micro|
|---|---|---|---|---|---|---|---|---|
|hasParentNode|1|1|1|1|1|1|1|1|
|isConnected| | | | | | | | |
|isLoading|1|1|1|1|1|1|1|1|
|currentScript| | | | | | | | |
|isEventListener| | | | | | | | |
|attributes|2|2|2|2|2|2|2|2|
|childNodes|3|3|1|1|3|1|3|1|
|lastElementInDocument| | | | | | | | |
|currentElementIsLastElement| | | | | | | | |
|currentScriptIsLastElement| | | | | | | | |
|syncUpgrade| | | | | | | | |


## review

1. It is worth noticing the combination 

## References


The predictive parser is a parser that the browser uses to parse and interpret HTML in the main HTML document. This parser follows a different logic of HTML interpretation and `HTMLElement` construction.

