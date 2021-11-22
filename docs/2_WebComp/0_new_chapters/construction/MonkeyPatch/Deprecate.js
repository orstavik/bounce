//The click needs to be deprecated as it gives a second entry point to the native dispatchEvent call.
MonkeyPatch.deprecate(HTMLElement.prototype, "click");

//There are too many ways into the attribute system, and there are nuances in how these ways work.
//When something is a string, don't wrap that string inside an object.
//Attributes should not be transferable as nodes/objects. Attributes are only started/removed on elements, never moved/mutated.
MonkeyPatch.deprecate(Element.prototype, 'setAttributeNS');
MonkeyPatch.deprecate(Element.prototype, 'getAttributeNS');
MonkeyPatch.deprecate(Element.prototype, 'setAttributeNodeNS');
MonkeyPatch.deprecate(Element.prototype, 'getAttributeNodeNS');

//todo working with Attributes created outside of the Node. Why?  When?
// MonkeyPatch.deprecate(Element.prototype, 'setAttributeNode');
// MonkeyPatch.deprecate(Element.prototype, 'getAttributeNode');
//todo should we deprecate the createAttribute avenue too? I think the answer is yes. Why keep it around?
// MonkeyPatch.deprecate(Document.prototype, 'createAttribute');
//todo but this is not true for elements. So why should it be true of attributes, long term?
//todo deprecate can be removed later.
// !!! It is a strategy to keep things simple for as long as possible, and then add complexity when the need arise. !!!
// all the deprecation looks to be related.