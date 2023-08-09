import { newFsm } from "./fsm.js";

export function newAppBarCenterFsm(dispatcher) {
  return newFsm(dispatcher, emptyState);
}

const emptyState = {
  tag: "empty",
  transitions: [
    ["todosLoaded", (e) => newSyncState(e.syncStore)],
  ],
};

function newSyncState(syncStore) {
  return {
    tag: "sync",
    transitions: [
      ["logoutClicked", (e) => emptyState],
    ],
    syncStore,
  };
}
