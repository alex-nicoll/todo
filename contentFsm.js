import { newFsm } from "./fsm.js";

export function newContentFsm(dispatcher) {
  return newFsm(dispatcher, loadingUsernameState);
}

const loadingUsernameState = {
  tag: "loadingUsername",
  transitions: [
    ["usernameLoaded", () => loadingTodosState],
    ["usernameNotLoaded", () => loginState],
    ["getUsernameError", () => errorState],
  ],
};

const loadingTodosState = {
  tag: "loadingTodos",
  transitions: [
    ["todosLoaded", (e) => newTodosState(e.todoStore)],
    ["logoutClicked", () => loggingOutState],
    ["getTodosError", () => errorState],
  ],
};

const loginState = {
  tag: "login",
  transitions: [
    ["loggedIn", () => loadingTodosState],
    ["loginError", () => errorState],
  ],
};

const errorState = {
  tag: "error",
  transitions: [],
};

function newTodosState(todoStore) {
  return {
    tag: "todos",
    transitions: [
      ["logoutClicked", () => loggingOutState],
      ["syncError", () => errorState],
    ],
    todoStore,
  };
}

const loggingOutState = {
  tag: "loggingOut",
  transitions: [
    ["loggedOut", () => loginState],
    ["logoutError", () => errorState],
  ],
};
