import { Action } from "./actions";
import { newObservable } from "./observable";

export type Fsm<S> = ReturnType<typeof newFsm<S>>;

export function newFsm<S>(initialState: S, transition: (state: S, action: Action) => S | undefined) {

  const obs = newObservable<S>(initialState);

  function dispatch(action: Action) {
    const nextState = transition(obs.getState(), action);
    if (nextState !== undefined) {
      obs.setState(nextState);
    }
  }

  return {
    dispatch,
    getState: obs.getState,
    subscribe: obs.subscribe
  };
}
