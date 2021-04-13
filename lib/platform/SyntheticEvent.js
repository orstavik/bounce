const synthetics = [];
let gcInterval;
let gcID = 0;

//return true if the synth is still active after gc.
function gcImpl(synth) {
  if (synth.listOfTargets.length === 0)
    return false;
  synth.listOfTargets = synth.listOfTargets.filter(targetWeakRef => targetWeakRef.deref()); //gc.
  if (synth.listOfTargets.length === 0) {
    stopDefinition(synth);
    return false;
  }
  return true;
}

function gc() {
  let oneActive = false;
  for (let synthetic of synthetics)
    gcImpl(synthetic).length && (oneActive = true);
  gcID = oneActive ? setTimeout(gcID, gcInterval) : 0;
}

function firstOverlapping(A, B) {
  for (let a of A)
    for (let b of B)
      if (a === b) return a;
}

// class MySyntheticEvent extends SyntheticEvent {
//   static get reservedEventSuffixes() {
//     return ['*start', '*stop'];
//   }
//
//   start() {                    //two callbacks
//
//   }
//
//   stop() {                     //two callbacks
//
//   }
// }

function stopDefinition(definition) {
  definition.stop();
  if (gcID !== 0) {
    const anotherActiveSynth = synthetics.find(synth => synth.listOfTargets.length);
    if (!anotherActiveSynth) {
      clearTimeout(gcID);
      gcID = 0;
    }
  }
}

export class SyntheticEvent {
  constructor(name) {
    //todo implement getter and setter for these three props. and freeze the two arrays.
    this.name = name;
    this.eventNames = [name, ...(this.constructor.reservedEventSuffixes || []).map(name => name.replace('*', this.name))];
    this.listOfTargets = [];
  }

  //checking connected is a bit expensive, so it is likely that you do not wish to use it.
  get connected() {
    return !!gcImpl(this).map(weakRef => weakRef.deref()).find(eventTarget => eventTarget.connected);
  }

  static define(name, SyntheticEventType) {
    if (!SyntheticEventType.start)
      throw new SyntaxError(`Missing start() callback in SyntheticEvent.`);
    if (!SyntheticEventType.stop)
      throw new SyntaxError(`Missing stop() callback in SyntheticEvent.`);
    const newSynth = new SyntheticEventType(name);
    for (let oldSynth of synthetics) {
      const overlapEventName = firstOverlapping(newSynth.eventNames, oldSynth.eventNames);
      if (overlapEventName)
        throw new Error(`Duplicate SyntheticEvent: The event '${overlapEventName}' is already been declared by '${oldSynth.constructor.name}'.`);
    }
    synthetics.push(newSynth);
  }

  static eventListenerAdded(type, target) {
    const definition = synthetics.find(synth => synth.eventNames.includes(type));
    if (!definition)
      return;
    definition.listOfTargets.push(new WeakRef(target));
    if (definition.listOfTargets.length === 1) {
      definition.start();
      if (gcID === 0)
        gcID = setTimeout(gc, gcInterval);
    }
  }

  static eventListenerRemoved(eventType, target) {
    const definition = synthetics.find(synth => synth.eventNames.includes(type));
    if (!definition)
      return;
    definition.listOfTargets.splice(definition.listOfTargets.findIndex(weakRef => weakRef.deref() === target), 1);
    if (definition.listOfTargets.length === 0)
      stopDefinition(definition);
  }

  static set _gcInterval(val) {
    gcInterval = val;
  }

  static get _gcInterval() {
    return gcInterval;
  }
}

/*
* 1. When SyntheticEvents should be dispatched as nextTick/setTimeout(..., 0). Should we implement nextTick as setTimeout(..., -x) //negative number?
* Or, use nextTick when the timestamp is undefined (or unset, ie. when arguments.length === 1)?
*
* 2. Todo The dependency is that when a CustomElement uses a SyntheticEvent, then that SyntheticEvent must be defined before the CustomElement is defined.
*    To fix this issue, a list of all event listeners with unknown names must be cached, under an UnknownSyntheticEvent entry or something, and then
*    when a new SyntheticEvent is added, then that list must be checked and if there are some matches, then those matches should be transferred over to the
*    new SyntheticEvent.
*/