# WhatIs: a frame?

## Philosophy: "frame" vs "event"?

In any stack based computing model, a "stack frame" is a set of operations that are added to the stack. The "frame" is the top most unit, and an operation in a frame can cause the addition of another frame on the stack, thus pausing the work of the current frame while going into the sub frame. 

In this way, "frame" and "stack" differs from the concepts "event" and "event loop":
 * When operation 2 in frame A with 4 operations adds another frame B to the stack, then *operation 3 and 4 in frame A is paused* while all the operations in frame B is computed.
 * When operation 2 triggered in event A (which triggers 4 operations) put another event B in the event loop, then *operation 3 and 4 triggered in event A* is computed before the operations triggered by event B is computed.

A frame is a recursive concept. If we for example think of a frame holding all the operations/statements/expressions of *one* JS `function`, then one of these operations may call another JS `function` which create a new frame and adds it to the stack.

## Who makes frames? and why? and when? 

If you are making a "computing machine", which could be a chip, a programming language run-time environment, or a framework to better support some operations in a programming language, you are likely to encounter the need to make a frame.

### Why 1? control race conditions

The frame comes in handy when you need to control the sequence of operations, ie. ensure that a set of operations complete before another set of operations begin. The JS `function` is an excellent example of such a control. When you run the set of operations/expressions inside function A, and one of these expressions calls another function B, then all the operations inside function B is processed before the flow of control is returned to function A and the remainder of the operations/expressions in function A is processed. Yes, conceptually it is "just like that".  

The reason you would need to make your own frame based system is because you don't control *when* a set of functions are called. The system/browser *calls* the functions for you. This can look like the system/browser at some hidden time doing a magic operations, or one expression essentially triggering a cascade of hidden sub-routine *calls*.   

Now, if there is something **wrong** in these magic/hidden cascade of calls, then you get **race conditions**. If something is **missing** in the hidden cascades, you are forced to create large statemachines that most likely cannot scale, be reused, and fail silently and horribly, short term and long term. In either case, you need to make your own frame.

### Why 2? control per-frame variables

Frames are also handy to group and manage variables in *recursive structures*. Again, the classic JS `function` is a perfect example of such scoping. Variables declared within the frame of each function are not messed with on different levels (unless your declare closure functions that is, but that is another topic altogether).

If variables are not scoped per frame, and an operation in one frame *may* write or read variables in another frame, you get... *race conditions*. This time the race conditions is 'lexically driven', not 'sequentially driven' as wrong sequencing above can cause. They are tightly related, but still different. The sequence of calls can be 100% correct, but if a subroutine mistakenly gets or writes values to a super-routine scope, then you still get an error. That walks and quacks like a race condition.

### How? 

When you make your own frame in a new run-time, you are more or less "building your virtual machine". A virtual machine is more or less only a set of interconnected stack-frame-run-operation machines. Starting from scratch, this is not that conceptually problematic, and not the topic of this text.

However, sometimes, you are trying to fix an already existing frame structure in your system. The **wrong** and **missing** is running inside the system, and you need to put a mid-level "platform" in between your application/components and the underlying run-time environment. 

Fixing an existing frame structure is **much** harder than making one from scratch. Making such a platform is all about **uncovering** the underlying platform. And this is done in the following *two* steps:
1. First you need to somehow *intercept all* triggers for when a frame a) begins and b) ends. In JS and the browser, this either a) monkeypatching all the native functions that adds a frame to the stack and b) listening for events or callbacks that *can be used* to signify either the start or the end of a frame.
2. Once *all* the beginnings and ends of the frame beginning/concluding operations are complete, then you need to dispatch an event or call all registered functions in a callback register.

Put simply, to *uncover* and fix a frame machine in the browser, you need to monkeypatch and listen for events when the frame begins and ends, and then dispatch a new sync "frame-start" and "frame-end" event at those times.  


