/**
 * An Observable<T> wraps a T, and allows a single client to subscribe to
 * reassignment of the T.
 */
export type Observable<T> = {
  getState: () => T;
  /**
   * setState reassigns the T. The subscriber must be registered before this
   * method is called.
   */
  setState: (nextState: T) => void;
  /**
   * subscribe registers a callback to be invoked when the T is reassigned. At
   * most one callback may be registered. subscribe returns a function that
   * unregisters the callback.
   */
  subscribe: (callback: () => void) => void;
};

export function newObservable<T>(initialState: T): Observable<T> {

  let state = initialState;
  
  let subscriber: (() => void) | undefined;

  function getState() {
    return state;
  }

  function setState(nextState: T) {
    state = nextState;
    subscriber!();
  }

  function subscribe(callback: () => void) {
    subscriber = callback;
    return () => subscriber = undefined;
  }

  return { getState, setState, subscribe };
}
