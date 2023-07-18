// SyncStore contains the state of the sync indicator.
export function newSyncStore() {

  // count is the number of synchronization operations in progress.
  let count = 0;

  let renderSyncIndicator;

  // syncIndicatorDidMount should be called when the sync indicator component
  // mounts. It should be passed a function that forces the component to
  // render.
  //
  // The render function is called whenever the return value of isSyncing()
  // changes.
  //
  // syncIndicatorDidMount returns a function that should be called before the
  // component unmounts.
  function syncIndicatorDidMount(render) {
    renderSyncIndicator = render;
    return () => renderSyncIndicator = undefined;
  }

  // isSyncing returns true if changes are currently being synchronized with
  // the server.
  function isSyncing() {
    return count !== 0;
  }

  // increment increases the number of sync operations in progress by 1.
  function increment() {
    count++;
    if (count === 1) {
      renderSyncIndicator();
    }
  }

  // decrement decreases the number of sync operations in progress by 1.
  function decrement() {
    count--;
    if (count === 0) {
      renderSyncIndicator();
    }
  }

  return {
    syncIndicatorDidMount,
    isSyncing,
    increment,
    decrement
  };
}
