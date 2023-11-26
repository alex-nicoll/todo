import { SyncStore } from "./syncStore";
import { TodoStore } from "./todoStore";

/**
 * An Action represents something that has happened, which, when dispatched, may
 * trigger a change in application state. A better name might have been "Event",
 * but that name is already used to refer to DOM events. Actions are similar to
 * input symbols in the context of finite state machines.
 */
export type Action = { tag: ActionTag; } | TodosLoaded | LoggedIn | UsernameLoaded

/** An ActionTag identifies a type of action. */
export enum ActionTag {
  GetUsernameError,
  GetTodosError,
  LoggedIn,
  LoggedOut,
  LoginError,
  LogoutClicked,
  LogoutError,
  UsernameLoaded,
  UsernameNotLoaded,
  SyncError,
  TodosLoaded,
}

export type TodosLoaded = {
    tag: ActionTag.TodosLoaded;
    todoStore: TodoStore;
    syncStore: SyncStore;
}

export type LoggedIn = {
  tag: ActionTag.LoggedIn;
  username: string;
}

export type UsernameLoaded = {
  tag: ActionTag.UsernameLoaded;
  username: string;
}
