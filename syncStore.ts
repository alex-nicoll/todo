export type SyncStore = ReturnType<typeof newSyncStore>;

/** SyncStore contains the state of the sync indicator. */
export function newSyncStore() {

  /** count is the number of synchronization operations in progress. */
  let count = 0;

  let subscriber: (() => void) | undefined;

  /**
   * subscribe registers a callback to be invoked whenever the return value of
   * {@link isSyncing()} changes. At most one callback may be registered.
   *
   * subscribe returns a function that unregisters the callback.
   */
  function subscribe(callback: () => void) {
    subscriber = callback;
    return () => subscriber = undefined;
  }

  /**
   * isSyncing returns true if changes are currently being synchronized with
   * the server.
   */
  function isSyncing() {
    return count !== 0;
  }

  /** increment increases the number of sync operations in progress by 1. */
  function increment() {
    count++;
    if (count === 1) {
      subscriber!();
    }
  }

  /** decrement decreases the number of sync operations in progress by 1. */
  function decrement() {
    count--;
    if (count === 0) {
      subscriber!();
    }
  }

  return {
    subscribe,
    isSyncing,
    increment,
    decrement
  };
}
