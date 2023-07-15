import * as React from "react";
import * as ReactDOM from "react-dom";
import {
  Alert,
  CircularProgress,
  Container,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography
} from "@mui/material";
import Add from "@mui/icons-material/Add";
import Clear from "@mui/icons-material/Clear";

init();

function init() {
  const apiURL = `${document.location.origin}/api`;
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(
    <Container maxWidth="sm">
      <Typography variant="h3" component="h1">
        To-Do
      </Typography>
      <TodoList apiURL={apiURL} />
    </Container>
  );
}

function TodoList({ apiURL }) {

  // state is "loading", "error", or an object containing a Map from key to
  // todo value. Wrapping the Map in an object allows us to trigger a re-render
  // without copying the entire Map.
  const [state, setState] = React.useState(() => "loading");

  // refVersion contains the current todo list version.
  const refVersion = React.useRef(undefined);

  // refLastTask is a queue of tasks implemented as a Promise chain.
  // It allows requests after the initial GET to be sent serially so that each
  // request contains the correct todo list version.
  const refLastTask = React.useRef(Promise.resolve());

  // refTodosUpdating is the set of todo keys for which there are pending
  // update operations.
  const refTodosUpdating = React.useRef(new Set());

  React.useEffect(initTodos, []);

  console.log(state);

  async function initTodos() {
    const result = await fetchObject({ method: "GET" });
    if (result === "failed") {
      return;
    }
    const { version, todos } = result;
    refVersion.current = version;
    setState({ todos: createTodosMap(todos) });
  }

  function removeTodo(key) {
    state.todos.delete(key);
    setState({ ...state });
    enqueue(() => post("delete", { key }));
  }

  async function updateTodo(key, value) {
    state.todos.set(key, value);
    setState({ ...state });
    if (refTodosUpdating.current.has(key)) {
      return;
    }
    refTodosUpdating.current.add(key);
    // Wait for 2 seconds.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    refTodosUpdating.current.delete(key);
    if (!state.todos.has(key)) {
      // todo was deleted while we were waiting.
      return;
    }
    enqueue(() => post("update", {
      key,
      value: state.todos.get(key)
    }));
  }

  async function appendTodo() {
    const result = await enqueue(() => post("append"));
    if (result === "done") {
      return;
    }
    state.todos.set(result.key, "");
    setState({ ...state });
  }

  // enqueue adds an async function to the back of the task queue. It returns a
  // Promise representing the function's result.
  function enqueue(task) {
    refLastTask.current = refLastTask.current.then(task);
    return refLastTask.current;
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
      setState("error");
      return "failed";
    }
    if (resp.status !== 200) {
      setState("error");
      return "failed";
    }
    let v;
    try {
      v = await resp.json();
    } catch (e) {
      console.error(e)
      setState("error");
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
  // detected by the server. If the request failed, then setState("error") has
  // already been called. Essentially, "done" indicates that there are no
  // further state updates to perform and the caller can safely return.
  //
  // Otherwise, it returns the response body parsed as JSON.
  async function post(operation, args) {
    const result = await fetchObject({
      method: "POST",
      body: JSON.stringify({
        operation,
        version: refVersion.current,
        ...args
      })
    });
    if (result === "failed") {
      return "done";
    }
    const {version, todos} = result;
    refVersion.current = version;
    if (todos !== undefined) {
      setState({ todos: createTodosMap(todos) })
      return "done";
    }
    return result;
  }

  if (state === "error") {
    return (
      <Alert severity="error">
        There was a problem completing the requested action. If this problem
        persists, please try again later.
      </Alert>
    );
    return ;
  }

  let listItems;
  if (state === "loading") {
    listItems = (
      <ListItem sx={{ justifyContent: "center" }} >
        <CircularProgress />
      </ListItem>
    );
  } else {
    listItems = [];
    state.todos.forEach((value, key) => listItems.push(
      <ListItem key={key}>
        <TextField
          multiline
          fullWidth
          size="small"
          placeholder="Item"
          spellcheck="false"
          value={value}
          onChange={(e) => updateTodo(key, e.target.value)}
        />
        <IconButton onClick={() => removeTodo(key)}>
          <Clear />
        </IconButton>
      </ListItem>
    ));
    listItems.push(
      <ListItemButton onClick={appendTodo}>
        <ListItemIcon>
          <Add />
        </ListItemIcon>
        <ListItemText primary="New item" />
      </ListItemButton>
    );
  }

  return (
    <List>
      {listItems}
    </List>
  );
}

function createTodosMap(todos) {
  const todosMap = new Map();
  for (const [key, value] of todos) {
    todosMap.set(key, value)
  }
  return todosMap;
}
