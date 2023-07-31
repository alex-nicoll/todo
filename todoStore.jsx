import { fetchObject, newPost } from "./fetchUtil.js";

// TodoStore contains the state of the todo list along with methods for
// changing the list and replicating those changes to the server.
//
// TodoStore also solves the problem of having the text field associated with
// each todo render independently. I.e., when the user types, only the text
// field that they are typing into renders - not the entire todo list. This
// improves performance when typing.
export function newTodoStore(apiUrl, syncStore) {

  // state is "loading", "error", or a map from todo ID to todo value. 
  let state = "loading";

  // version is the current todo list version.
  let version;

  // lastTask is a queue of tasks implemented as a Promise chain.
  // It allows operations after the initial GET to be performed serially so
  // that each request contains the correct todo list version.
  let lastTask = Promise.resolve();

  // todosUpdating is the set of todo IDs for which there are pending update
  // operations.
  const todosUpdating = new Set();

  let renderList;

  const mapRenderTextField = new Map();

  // listDidMount should be called when the component representing the entire
  // todo list mounts. It should be passed a function that forces the component
  // to render.
  //
  // The render function is called whenever the return value of getState()
  // changes. If getState() returns a map, the render function is called
  // whenever the keys (todo IDs) change.
  //
  // listDidMount returns a function that should be called before the component
  // unmounts.
  function listDidMount(render) {
    renderList = render;
    initTodos();
    return () => renderList = undefined;
  }

  // textFieldDidMount should be called when the component representing the
  // text field of a particular todo mounts. It should be passed the todo ID
  // and a function that forces the component to render.
  //
  // The render function is called whenever the associated todo value changes.
  //
  // textFieldDidMount returns a function that should be called before the
  // component unmounts.
  function textFieldDidMount(id, render) {
    mapRenderTextField.set(id, render);
    return () => mapRenderTextField.delete(id);
  }

  // getState returns "loading", "error", or a map from todo ID to todo value. 
  function getState() {
    return state;
  }

  async function initTodos() {
    const result = await fetchObject(apiUrl, { method: "GET" });
    if (result === "failed") {
      state = "error";
      renderList();
      return;
    }
    version = result.version;
    state = createTodosMap(result.todos);
    renderList();
  }

  function deleteTodo(id) {
    state.delete(id);
    renderList();
    enqueue(() => post("delete", { id }));
  }

  async function updateTodo(id, value) {
    state.set(id, value);
    mapRenderTextField.get(id)();
    if (todosUpdating.has(id)) {
      return;
    }
    syncStore.increment();
    todosUpdating.add(id);
    // Wait for 2 seconds.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    todosUpdating.delete(id);
    if (!state.has(id)) {
      // todo was deleted while we were waiting.
      syncStore.decrement();
      return;
    }
    // Instead of using enqueue, update lastTask directly to avoid incrementing
    // and decrementing the sync count an additional time.
    lastTask = lastTask.then(
      () => post("update", { id, value: state.get(id) })
    );
    await lastTask;
    syncStore.decrement();
  }

  async function appendTodo() {
    const result = await enqueue(() => post("append"));
    if (result === "done") {
      return;
    }
    state.set(result.id, "");
    renderList();
  }

  // enqueue adds an async function to the back of the task queue. It returns a
  // Promise representing the function's result.
  // While the task is queued or executing, the sync count is increased by one.
  function enqueue(task) {
    syncStore.increment();
    const result = lastTask.then(task);
    lastTask = result.then(syncStore.decrement);
    return result;
  }

  // post sends a POST request and partially handles the response. post
  // includes the current todo list version in the request, and updates the
  // current version to match the version in the response.
  //
  // It returns "done" if the request failed, or if the request succeeded and
  // the todo list has been downloaded and rerendered due to a version mismatch
  // detected by the server. If the request failed, then state has already been
  // set to "error". Essentially, "done" indicates that there are no further
  // state updates to perform and the caller can safely return.
  //
  // Otherwise, it returns the response body parsed as JSON.
  async function post(operation, args) {
    const result = await fetchObject(
      apiUrl,
      newPost(operation, { version, ...args })
    );
    if (result === "failed") {
      state = "error";
      renderList();
      return "done";
    }
    version = result.version;
    if (result.todos !== undefined) {
      state = createTodosMap(result.todos);
      renderList();
      return "done";
    }
    return result;
  }

  return {
    listDidMount,
    textFieldDidMount,
    getState,
    deleteTodo,
    updateTodo,
    appendTodo
  };
}

function createTodosMap(todos) {
  const todosMap = new Map();
  for (const [id, value] of todos) {
    todosMap.set(id, value)
  }
  return todosMap;
}
