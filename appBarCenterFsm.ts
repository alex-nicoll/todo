import { Action, ActionTag } from "./actions";
import { assertNever } from "./assertNever";
import { newFsm } from "./fsm";
import { SyncStore } from "./syncStore";

export type AppBarCenterFsm = ReturnType<typeof newAppBarCenterFsm>;

export function newAppBarCenterFsm() {
  return newFsm(emptyState, transition);
}

export enum StateTag { Empty, Sync }

type State = typeof emptyState | ReturnType<typeof newSyncState>;

const emptyState = { tag: StateTag.Empty } as const;

function newSyncState(syncStore: SyncStore) {
  return { tag: StateTag.Sync, syncStore } as const;
}

export function transition(state: State, action: Action): State | undefined {
  switch (state.tag) {
    case StateTag.Empty:

      switch (action.tag) {
        case ActionTag.TodosLoaded: return newSyncState(action.syncStore);
      }

      break;
    case StateTag.Sync:

      switch (action.tag) {
        case ActionTag.LogoutClicked: return emptyState;
      }

      break;
    default: assertNever(state);
  }
  return undefined;
}
