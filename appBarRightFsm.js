import { newFsm } from "./fsm.js";

export function newAppBarRightFsm(dispatcher) {
  return newFsm(dispatcher, emptyState);
}

const emptyState = {
  tag: "empty",
  transitions: [
    ["usernameLoaded", (e) => newAccountState(e.username)],
    ["loggedIn", (e) => newAccountState(e.username)],
  ],
};

function newAccountState(username) {
  return {
    tag: "account",
    transitions: [
      ["logoutClicked", (e) => emptyState],
    ],
    username,
  };
}
