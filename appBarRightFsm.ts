import { Action, ActionTag, LoggedIn, UsernameLoaded } from "./actions";
import type { Dispatcher } from "./dispatcher";
import { newFsm } from "./fsm";

export type AppBarRightFsm = ReturnType<typeof newAppBarRightFsm>;

export function newAppBarRightFsm(dispatcher: Dispatcher) {
  return newFsm(dispatcher, emptyState);
}

export enum AppBarRightStateTag {
  Empty,
  User
}

export type AppBarRightState = typeof emptyState | ReturnType<typeof newUserState>;

const emptyState = {
  tag: AppBarRightStateTag.Empty,
  transitions: [
    [ActionTag.UsernameLoaded, (a: Action) => newUserState((a as UsernameLoaded).username)],
    [ActionTag.LoggedIn, (a: Action) => newUserState((a as LoggedIn).username)],
  ],
} as const;

function newUserState(username: string) {
  return {
    tag: AppBarRightStateTag.User,
    transitions: [
      [ActionTag.LogoutClicked, () => emptyState],
    ],
    username,
  } as const;
}
