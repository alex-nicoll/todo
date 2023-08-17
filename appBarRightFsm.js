import { newFsm } from "./fsm.js";

export function newAppBarRightFsm(dispatcher) {
  return newFsm(dispatcher, emptyState);
}

const emptyState = {
  tag: "empty",
  transitions: [
    ["usernameLoaded", (e) => newUserState(e.username)],
    ["loggedIn", (e) => newUserState(e.username)],
  ],
};

function newUserState(username) {
  return {
    tag: "user",
    transitions: [
      ["logoutClicked", (e) => emptyState],
    ],
    username,
  };
}
