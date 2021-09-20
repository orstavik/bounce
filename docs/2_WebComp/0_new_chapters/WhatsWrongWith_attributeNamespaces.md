# WhatsWrongWith: attribute namespaces?

Put simply, attribute namespaces is an old legacy from XHTML that is no longer in use in the browser. They are there, but there are several bugs in how they interact with new*er* features such as `MutationObserver` and `attributeChangeCallback()`.

The short answer is **do not use attribute namespaces**. The longer answer for why is described below.

## WhatIs: attribute namespaces?

XML had a dream. Put simply, that dream was that:
1. the meaning of words could be pinned down *more exactly* than what we are currently doing. Words such as "apple" or "button" could have a *one* precise definition.
2. This set of singular definitions could be described in *one* language: XML. You could have one global set of parsers and interpreters that *all* would understand the *same* meaning from a single word.
3. The problem with *single* definitions of words is that words can have "duality of meaning". For example, "but" means "goal" in French and "shoe" in Polish. To get an exact definition, you therefore need to specify which language/namespace the word belongs to.
4. So, if you have a namespace for the words, you could then mix words from different languages in *one* document to produce meaning.

Put simply, the dream of XML is something this:
```xml
<polish:but></polish:but>
<english:kick></english:kick>
<norwegian:fotball></norwegian:fotball>
<french:but></french:but>
```

## WhatHappenedTo: namespaces?

The problem with namespaces is diversification: For example: "but" in english means something else than "but" in french and polish. But "but" also several different meanings in English: "but off", big but, but but, etc. So in English, you need to define not only the dialect, but also the thematic context, the linguistic role etc for "but". And so the slippery slope begins, "but" is given many, many, *many* different definitions tucked away in equally many different namespaces. And which but belongs to which namespace, becomes a joke.

So, philosophically, namespaces become excuses. Whenever there is a contradiction of meaning of a word or a duality, no problem, just make a new namespace. The buck never stops. No one takes any responsibility. There is only diversification. And so, the xml idea stays on the level of syntactics, never really stepping into the domain of semiotics that XML purports to do. 

Thus, the XML dream of precise semantics for the philosophers becomes a syntactic nightmare for technical practitioners: as namespaces starts to flourish, who can remember which word belongs to which namespace? And, even more importantly, how do the browser or some other interpreter process words from a different namespace? And how do interpreters mix and match different words from different namespaces? 

Furthermore, support in HTML for XML namespaces were patchy. You couldn't declare elements in a namespace. You could only declare namespaces for attributes. And there was no builtin model to associate a specific functionality with a specific namespace. It was a precursor to custom elements, only specified syntactically. 

This explosion of complexity will happen as soon as people start making new namespaces. And so, people never really did.  

## WhatHappened: to namespaces?

Put simply, they never really caught on, and they were left behind, and then died. So, the traces of the namespace logic that you see in the DOM, especially in `Element.setAttributeNS()`, is a feature that never really was in wide use and which is definitively not in wide use today. It isn't really a feature that is associated with a select group of element types, although the few uses one can see of attribute namespaces or document namespaces are commonly associated with such   