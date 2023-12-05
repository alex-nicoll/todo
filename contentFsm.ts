import { Action, ActionTag } from "./actions";
import { assertNever } from "./assertNever";
import { newFsm } from "./fsm";
import { TodoStore } from "./todoStore";

export type ContentFsm = ReturnType<typeof newContentFsm>;

export function newContentFsm() {
  return newFsm(loadingUsernameState, transition);
}

export enum StateTag {
  Error,
  LoadingTodos,
  LoadingUsername,
  LoggingOut,
  Login,
  Todos,
}

type State =
  | typeof loadingUsernameState
  | typeof loadingTodosState
  | typeof loginState
  | typeof errorState
  | ReturnType<typeof newTodosState>
  | typeof loggingOutState;

const loadingUsernameState = { tag: StateTag.LoadingUsername } as const;

const loadingTodosState = { tag: StateTag.LoadingTodos } as const;

const loginState = { tag: StateTag.Login } as const;

const errorState = { tag: StateTag.Error } as const;

function newTodosState(todoStore: TodoStore) {
  return { tag: StateTag.Todos, todoStore } as const;
}

const loggingOutState = { tag: StateTag.LoggingOut } as const;

export function transition(state: State, action: Action): State | undefined {
  switch (state.tag) {
    case StateTag.LoadingUsername:

      switch (action.tag) {
        case ActionTag.UsernameLoaded: return loadingTodosState;
        case ActionTag.UsernameNotLoaded: return loginState;
        case ActionTag.GetUsernameError: return errorState;
      }

      break;
    case StateTag.LoadingTodos:

      switch (action.tag) {
        case ActionTag.TodosLoaded: return newTodosState(action.todoStore);
        case ActionTag.LogoutClicked: return loggingOutState;
        case ActionTag.GetTodosError: return errorState;
      }

      break;
    case StateTag.Login:

      switch (action.tag) {
        case ActionTag.LoggedIn: return loadingTodosState;
        case ActionTag.LoginError: return errorState;
      }

      break;
    case StateTag.Error:
      break;
    case StateTag.Todos:

      switch (action.tag) {
        case ActionTag.LogoutClicked: return loggingOutState;
        case ActionTag.SyncError: return errorState;
      }
      
      break;
    case StateTag.LoggingOut:

      switch (action.tag) {
        case ActionTag.LoggedOut: return loginState;
        case ActionTag.LogoutError: return errorState;
      }

      break;
    default: assertNever(state);
  }
  return undefined;
}