import { AppBarCenterState } from "./appBarCenterFsm";
import { AppBarRightState } from "./appBarRightFsm";
import { ContentState } from "./contentFsm";
import { Dispatcher } from "./dispatcher";

export type State = AppBarCenterState | AppBarRightState | ContentState;

export type Fsm = ReturnType<typeof newFsm>;

// Fsm works as follows. When an Action is dispatched using dispatcher, if that
// Action's ActionTag matches the ActionTag of one of the current state's
// transitions, that transition's state constructor is called, then the value of
// getState() changes to the return value of the constructor, and then the
// subscriber is called.
export function newFsm(dispatcher: Dispatcher, startState: State) {

  let state: State;

  let unregisterFns: (() => void)[];

  let subscriber: (() => void) | undefined;

  enterState(startState);

  function getState() {
    return state;
  }

  function transition(nextState: State) {
    unregisterFns.forEach((fn) => fn());
    enterState(nextState);
    subscriber!();
  }

  function enterState(nextState: State) {
    unregisterFns = nextState.transitions.map(([tag, stateCtor]) => {
      return dispatcher.register(tag, (a) => {
        transition(stateCtor(a));
      });
    });
    state = nextState;
  }

  // subscribe registers a callback to be invoked whenever the value of
  // getState() changes. At most one callback may be registered.
  // subscribe returns a function that unregisters the callback.
  function subscribe(callback: () => void) {
    subscriber = callback;
    return () => subscriber = undefined;
  }

  return {
    getState,
    subscribe
  };
}
