import { callApi } from "./api.js";

// TodoStore contains the state of the todo list along with methods for
// changing the list and replicating those changes to the server.
//
// TodoStore also solves the problem of having the text field associated with
// each todo render independently, which improves performance when typing.
// I.e., when the user types, only the text field that they are typing into
// renders - not the entire todo list. This can be achieved by having text
// field React components call subscribeToValue in an effect. A list component,
// on the other hand, might call subscribeToKeys in an effect.
//
// - apiUrl is the URL with which API calls should be executed.
// - dispatcher is the Dispatcher instance through which sync error events will
// be dispatched.
// - syncStore is the SyncStore instance associated with this TodoStore. It will
// be incremented and decremented when appropriate.
// - version is the current todo list version.
// - todos is a map from todo ID to todo value.
export function newTodoStore({ apiUrl, dispatcher, syncStore, version, todos }) {

  // lastTask is a queue of tasks implemented as a Promise chain.
  // It allows operations to be performed serially so that each request
  // contains the correct todo list version.
  let lastTask = Promise.resolve();

  // todosUpdating is the set of todo IDs for which there are pending update
  // operations.
  const todosUpdating = new Set();

  let keySubscriber;

  const mapValueSubscribers = new Map();

  // subscribeToKeys registers a callback to be invoked whenever the todo IDs
  // (keys of the map returned by getTodos) change, but not when the todo
  // values change. At most one callback may be registered.
  //
  // subscribeToKeys returns a function that unregisters the callback.
  function subscribeToKeys(callback) {
    keySubscriber = callback;
    return () => keySubscriber = undefined;
  }

  // subscribeToValue registers a callback to be invoked whenever the value
  // associated with the given todo ID changes. At most one callback may be
  // registered per todo ID.
  //
  // subscribeToValue returns a function that unregisters the callback.
  function subscribeToValue(id, callback) {
    mapValueSubscribers.set(id, callback);
    return () => mapValueSubscribers.delete(id);
  }

  // getTodos returns a map from todo ID to todo value. 
  function getTodos() {
    return todos;
  }

  function deleteTodo(id) {
    todos.delete(id);
    keySubscriber();
    enqueue(() => callApiWithVersion("deleteTodo", { id }));
  }

  async function updateTodo(id, value) {
    todos.set(id, value);
    mapValueSubscribers.get(id)();
    if (todosUpdating.has(id)) {
      return;
    }
    syncStore.increment();
    todosUpdating.add(id);
    // Wait for 2 seconds.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    todosUpdating.delete(id);
    if (!todos.has(id)) {
      // todo was deleted while we were waiting.
      syncStore.decrement();
      return;
    }
    // Instead of using enqueue, update lastTask directly to avoid incrementing
    // and decrementing the sync count an additional time.
    lastTask = lastTask.then(
      () => callApiWithVersion("updateTodo", { id, value: todos.get(id) })
    );
    await lastTask;
    syncStore.decrement();
  }

  async function appendTodo() {
    const result = await enqueue(() => callApiWithVersion("appendTodo"));
    if (result === "done") {
      return;
    }
    todos.set(result.id, "");
    keySubscriber();
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

  // callApiWithVersion calls the API and partially handles the response. It
  // includes the current todo list version in the request, and updates the
  // current version to match the version in the response.
  //
  // It returns "done" if the request failed, or if the request succeeded and
  // the todo list has been downloaded and rerendered due to a version mismatch
  // detected by the server. If the request failed, a sync error event is
  // dispatched.
  //
  // Otherwise, it returns the response body parsed as JSON.
  async function callApiWithVersion(operation, args) {
    const result = await callApi(apiUrl, operation, { version, ...args });
    if (result === "failed") {
      dispatcher.dispatch({ id: "syncError" });
      return "done";
    }
    version = result.version;
    if (result.todos !== undefined) {
      todos = newTodosMap(result.todos);
      keySubscriber();
      return "done";
    }
    return result;
  }

  return {
    subscribeToKeys,
    subscribeToValue,
    getTodos,
    deleteTodo,
    updateTodo,
    appendTodo
  };
}

export function newTodosMap(todos) {
  const todosMap = new Map();
  for (const [id, value] of todos) {
    todosMap.set(id, value)
  }
  return todosMap;
}
