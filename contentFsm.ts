import { Action, ActionTag, TodosLoaded } from "./actions";
import type { Dispatcher } from "./dispatcher";
import { newFsm } from "./fsm";
import { TodoStore } from "./todoStore";

export type ContentFsm = ReturnType<typeof newContentFsm>;

export function newContentFsm(dispatcher: Dispatcher) {
  return newFsm(dispatcher, loadingUsernameState);
}

export enum ContentStateTag {
  Error,
  LoadingTodos,
  LoadingUsername,
  LoggingOut,
  Login,
  Todos,
}

export type ContentState =
  typeof loadingUsernameState
  | typeof loadingTodosState
  | typeof loginState
  | typeof errorState
  | ReturnType<typeof newTodosState>
  | typeof loggingOutState;

const loadingUsernameState = {
  tag: ContentStateTag.LoadingUsername,
  transitions: [
    [ActionTag.UsernameLoaded, () => loadingTodosState],
    [ActionTag.UsernameNotLoaded, () => loginState],
    [ActionTag.GetUsernameError, () => errorState],
  ],
} as const;

const loadingTodosState = {
  tag: ContentStateTag.LoadingTodos,
  transitions: [
    [ActionTag.TodosLoaded, (a: Action) => newTodosState((a as TodosLoaded).todoStore)],
    [ActionTag.LogoutClicked, () => loggingOutState],
    [ActionTag.GetTodosError, () => errorState],
  ],
} as const;

const loginState = {
  tag: ContentStateTag.Login,
  transitions: [
    [ActionTag.LoggedIn, () => loadingTodosState],
    [ActionTag.LoginError, () => errorState],
  ],
} as const;

const errorState = {
  tag: ContentStateTag.Error,
  transitions: [],
} as const;

function newTodosState(todoStore: TodoStore) {
  return {
    tag: ContentStateTag.Todos,
    transitions: [
      [ActionTag.LogoutClicked, () => loggingOutState],
      [ActionTag.SyncError, () => errorState],
    ],
    todoStore,
  } as const;
}

const loggingOutState = {
  tag: ContentStateTag.LoggingOut,
  transitions: [
    [ActionTag.LoggedOut, () => loginState],
    [ActionTag.LogoutError, () => errorState],
  ],
} as const;
