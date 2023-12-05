import { SyncStore } from "./syncStore";
import { TodoStore } from "./todoStore";

/**
 * An Action represents something that has happened. When an Action is
 * dispatched, the application may change state. A better name might have been
 * "Event", but that name is already used to refer to DOM events. Actions are
 * similar to input symbols in the context of finite state machines.
 */
export type Action =  BasicAction | ComplexAction;

type BasicAction = { tag: Exclude<ActionTag, ComplexAction["tag"]> }

type ComplexAction = TodosLoaded | LoggedIn | UsernameLoaded;

/** An ActionTag identifies a kind of {@link Action}. */
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
