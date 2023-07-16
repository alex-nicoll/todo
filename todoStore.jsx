// TodoStore contains the state of the todo list along with methods for
// changing the list and replicating those changes to the server.
//
// TodoStore also solves the problem of having the text field associated with
// each todo render independently. I.e., when the user types, only the text
// field that they are typing into renders - not the entire todo list. This
// improves performance when typing.
export function newTodoStore(apiURL) {

  // state is "loading", "error", or a map from todo key to todo value. 
  let state = "loading";

  // version is the current todo list version.
  let version;

  // lastTask is a queue of tasks implemented as a Promise chain.
  // It allows operations after the initial GET to be performed serially so
  // that each request contains the correct todo list version.
  let lastTask = Promise.resolve();

  // todosUpdating is the set of todo keys for which there are pending update
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
  // whenever the keys change.
  //
  // listDidMount returns a function that should be called before the component
  // unmounts.
  function listDidMount(render) {
    renderList = render;
    initTodos();
    return () => renderList = undefined;
  }

  // textFieldDidMount should be called when the component representing the
  // text field of a particular todo mounts. It should be passed the todo key
  // and a function that forces the component to render.
  //
  // The render function is called whenever the associated todo value changes.
  //
  // textFieldDidMount returns a function that should be called before the
  // component unmounts.
  function textFieldDidMount(key, render) {
    mapRenderTextField.set(key, render);
    return () => mapRenderTextField.delete(key);
  }

  // state returns "loading", "error", or a map from todo key to todo value. 
  function getState() {
    return state;
  }

  async function initTodos() {
    const result = await fetchObject({ method: "GET" });
    if (result === "failed") {
      return;
    }
    version = result.version;
    state = createTodosMap(result.todos);
    renderList();
  }

  function deleteTodo(key) {
    state.delete(key);
    renderList();
    enqueue(() => post("delete", { key }));
  }

  async function updateTodo(key, value) {
    state.set(key, value);
    mapRenderTextField.get(key)();
    if (todosUpdating.has(key)) {
      return;
    }
    todosUpdating.add(key);
    // Wait for 2 seconds.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    todosUpdating.delete(key);
    if (!state.has(key)) {
      // todo was deleted while we were waiting.
      return;
    }
    enqueue(() => post("update", {
      key,
      value: state.get(key)
    }));
  }

  async function appendTodo() {
    const result = await enqueue(() => post("append"));
    if (result === "done") {
      return;
    }
    state.set(result.key, "");
    renderList();
  }

  // enqueue adds an async function to the back of the task queue. It returns a
  // Promise representing the function's result.
  function enqueue(task) {
    lastTask = lastTask.then(task);
    return lastTask;
  }

  // fetchObject calls fetch with apiUrl and the given options, checks the
  // status code, and parses the response body as JSON. If an error is
  // encountered, fetchObject sets state to "error" and returns "failed".
  // Otherwise, it returns the parsed response body.
  async function fetchObject(options) {
    console.log(options);
    let resp;
    try {
      resp = await fetch(apiURL, options);
    } catch (e) {
      console.error(e);
      state = "error";
      renderList();
      return "failed";
    }
    if (resp.status !== 200) {
      state = "error";
      renderList();
      return "failed";
    }
    let v;
    try {
      v = await resp.json();
    } catch (e) {
      console.error(e)
      state = "error";
      renderList();
      return "failed";
    }
    console.log(v);
    return v;
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
    const result = await fetchObject({
      method: "POST",
      body: JSON.stringify({ operation, version, ...args })
    });
    if (result === "failed") {
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
  for (const [key, value] of todos) {
    todosMap.set(key, value)
  }
  return todosMap;
}
