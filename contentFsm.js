import { newFsm } from "./fsm.js";

export function newContentFsm(dispatcher) {
  return newFsm(dispatcher, loadingUsernameState);
}

const loadingUsernameState = {
  tag: "loadingUsername",
  transitions: [
    ["usernameLoaded", (e) => loadingTodosState],
    ["usernameNotLoaded", (e) => loginState],
    ["getUsernameError", (e) => errorState],
  ],
};

const loadingTodosState = {
  tag: "loadingTodos",
  transitions: [
    ["todosLoaded", (e) => newTodosState(e.todoStore)],
    ["logoutClicked", (e) => loggingOutState],
    ["getTodosError", (e) => errorState],
  ],
};

const loginState = {
  tag: "login",
  transitions: [
    ["loggedIn", (e) => loadingTodosState],
    ["loginError", (e) => errorState],
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
      ["logoutClicked", (e) => loggingOutState],
      ["syncError", (e) => errorState],
    ],
    todoStore,
  };
}

const loggingOutState = {
  tag: "loggingOut",
  transitions: [
    ["loggedOut", (e) => loginState],
    ["logoutError", (e) => errorState],
  ],
};
