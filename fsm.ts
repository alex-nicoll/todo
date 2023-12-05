import { Action } from "./actions";

export type Fsm<S> = ReturnType<typeof newFsm<S>>;

export function newFsm<S>(initialState: S, transition: (state: S, action: Action) => S | undefined) {

  let state: S = initialState;

  let subscriber: (() => void) | undefined;

  function dispatch(action: Action) {
    const nextState = transition(state, action);
    if (nextState !== undefined) {
      state = nextState;
      subscriber!();
    }
  }

  function getState() {
    return state;
  }

  // subscribe registers a callback to be invoked whenever the value of
  // getState() changes. At most one callback may be registered.
  // subscribe returns a function that unregisters the callback.
  function subscribe(callback: () => void) {
    subscriber = callback;
    return () => subscriber = undefined;
  }

  return { dispatch, getState, subscribe }
}
