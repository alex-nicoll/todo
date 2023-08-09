// Fsm works as follows. When an event is dispatched using dispatcher, if that
// event's ID matches the event ID of one of the current state's transitions,
// that transition's state constructor is called, then the value of getState()
// changes to the return value of the constructor, and then the subscriber is
// called.
export function newFsm(dispatcher, startState) {

  let state;

  let unregisterFns;

  let subscriber;

  enterState(startState);

  function getState() {
    return state;
  }

  function transition(nextState) {
    unregisterFns.forEach((fn) => fn());
    enterState(nextState);
    subscriber();
  }

  function enterState(nextState) {
    unregisterFns = nextState.transitions.map(([eventId, stateCtor]) => {
      return dispatcher.register(eventId, (e) => {
        transition(stateCtor(e));
      });
    });
    state = nextState;
  }

  // subscribe registers a callback to be invoked whenever the value of
  // getState() changes. At most one callback may be registered.
  // subscribe returns a function that unregisters the callback.
  function subscribe(callback) {
    subscriber = callback;
    return () => subscriber = undefined;
  }

  return {
    getState,
    subscribe
  };
}
