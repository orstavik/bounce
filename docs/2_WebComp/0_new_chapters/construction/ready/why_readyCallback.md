# Why: do you write to attributes when an element is constructed?

## use-case 1: attribute formating 

We need to correct wrong attributes from template.

Attributes can be used to control the layout of an element. To avoid changing this layout multiple time during the loading of the web page, we can are used to control the behavior of an element, and 

## use-case 2: computed attributes

We need to compute a composed attribute
<Div a=1 B=2>
should be turned into
<div a=1 b=2 ::c=3>

This can be useful when style computation cannot be done in css, for example if you need to introduce random.

This can also be useful when the element is to be observable from the lightDom Js, and you want to encapsulate the logic inside. That way you can make style changes, and also let the js of the lightDom "see" the style of the component.

This can be useful when the event listeners or some other state is dependent on multiple attributes in complex ways. This way the event listener state is easier to read in template and easier to observe from lightDom. (edited) 

## use-case 3: mirror JS state into HTML

You need to reflect an external state in the DOM in the html template. Examples could be
1. The base.href on the <html> element. 
2. The number/symbol on an <li> element based on the parentNode, it's properties and the siblings.
3. A layout element that rotates the screen automatically based on screen size or screen orientation. This rotation is controlled by css, controlled by attribute, which can first be read during ready.

It would be better to show this as a private attribute, and then hide that it in devtools or elsewhere.

## WhatIs: the ideal web component?

1. Creates a ShadowRoot in constructor. The shadowDom is static, it never changes elements. Difference in view is created solely using css variables and :host([variable]). 
2. Adds default event listeners in constructor. 
3. Writes no attributes to host node.

But then, how to deal with 'writing attributes'?

### Strategy 1: constructor() part 2 in first connectedCallback() 

Connected callback is used to delay work "until needed".
X. The idea/confusion then becomes to do nothing in the constructor, and all in the first connectedCallback. That way delay as much as possible as late as possible.
X2. The problem here is that you a) need to make a first connectedCallback and b) ignore/reproduce construction attributeChangedCallbacks.
X3. Second problem is that when you make elements off Dom, they are blank. So in order to work with elements before before they should be viewable, such elements must be added off the view, and only then can other properties and methods be called.
X4. This is a doable strategy, but it require boilerplate code for first connectedCallback, and strict adherence to soft rule in order to avoid confusion with not-yet-in-DOM elements. (edited)

### Strategy 1: constructor() part 2 in first attributeChangedCallback() or connectedCallback()

Y. The alternative to firstConnectedCallback, is a firstAttributeOrConnectedCallback.
Y1. The firstAttributeOrConnectedCallback will require a little more boilerplate as it will need to intercept both the connectedCallback and attributeChangedCallback, but it will enable you to not ignore/reproduce the initial attributeChangedCallbacks.
Y2. But. All the problems and confusion with not-yet-in-DOM will be exacerbated, because now it will be not-yet-in-nor-with-observed-attribute-DOM. Thus, to know if an element has been setup, would require knowing if the element is either _has been_ connected before or _has had_ any observedAttributes set. You really don't know, you have to check manually, you have to look inside to see the state of the element.

### Strategy 3: constructor() part 2 in a readyCallback()

Z. To avoid the confusion of "maybe" an off-the-DOM element _has been_ fully set up, you need a readyCallback. A readyCallback is a method that will be called:
1. after the constructor, and
2. Before both attributeChangedCallback and connectedCallback for the same element AND
3. Before the next constructor of any other element in the same html branch being constructed AND
4. Before the end of an HTML branch construction, such as before the innerHTML function returns or when the predictive parser ends.