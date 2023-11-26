import { Action, ActionTag, TodosLoaded } from "./actions";
import { Dispatcher } from "./dispatcher";
import { newFsm } from "./fsm";
import { SyncStore } from "./syncStore";

export type AppBarCenterFsm = ReturnType<typeof newAppBarCenterFsm>;

export function newAppBarCenterFsm(dispatcher: Dispatcher) {
  return newFsm(dispatcher, emptyState);
}

export enum AppBarCenterStateTag {
  Empty,
  Sync
}

export type AppBarCenterState = typeof emptyState | ReturnType<typeof newSyncState>;

const emptyState = {
  tag: AppBarCenterStateTag.Empty,
  transitions: [
    [ActionTag.TodosLoaded, (a: Action) => newSyncState((a as TodosLoaded).syncStore)],
  ],
} as const;

function newSyncState(syncStore: SyncStore) {
  return {
    tag: AppBarCenterStateTag.Sync,
    transitions: [
      [ActionTag.LogoutClicked, () => emptyState],
    ],
    syncStore,
  } as const;
}
