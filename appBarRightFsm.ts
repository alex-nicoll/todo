import { Action, ActionTag } from "./actions";
import { assertNever } from "./assertNever";
import { newFsm } from "./fsm";

export type AppBarRightFsm = ReturnType<typeof newAppBarRightFsm>;

export function newAppBarRightFsm() {
  return newFsm(emptyState, transition);
}

export enum StateTag { Empty, User }

type State = typeof emptyState | ReturnType<typeof newUserState>;

const emptyState = { tag: StateTag.Empty } as const;

function newUserState(username: string) {
  return { tag: StateTag.User, username } as const;
}

export function transition(state: State, action: Action): State | undefined {
  switch (state.tag) {
    case StateTag.Empty:

      switch (action.tag) {
        case ActionTag.UsernameLoaded: return newUserState(action.username);
        case ActionTag.LoggedIn: return newUserState(action.username);
      }

      break;
    case StateTag.User:

      switch (action.tag) {
        case ActionTag.LogoutClicked: return emptyState;
      }

      break;
    default: assertNever(state);
  }
  return undefined;
}