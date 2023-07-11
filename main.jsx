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

  // state is "loading", "error", or an object with properties:
  // - "todos": a Map from key to input ref, initial value, and disabled state.
  // Wrapping the Map in an object allows us to trigger a re-render without
  // copying the entire Map.
  // - "key": when changed, the entire list is remounted. Why? TodoList is
  // essentially a list of uncontrolled inputs; the state of each todo is
  // stored in the DOM. When the todos are loaded and subsequently rendered, we
  // use the defaultValue prop to set the initial state. Easy peasy. But we run
  // into a problem when reloading the todos. An input with the same key but
  // different value won't be remounted, and so defaultValue can't be used to
  // set its state. So, after reloading the todos, we pass a new key to the
  // parent, causing each input to be remounted and assigned defaultValue.
  const [state, setState] = React.useState(() => "loading");

  // refVersion contains the current todo list version.
  const refVersion = React.useRef(undefined);

  // refLastTask is a queue of tasks implemented as a Promise chain.
  // It allows requests after the initial GET to be sent serially so that each
  // request contains the correct todo list version.
  const refLastTask = React.useRef(Promise.resolve());

  React.useEffect(initTodos, []);

  console.log(state);

  async function initTodos() {
    const result = await fetchObject({ method: "GET" });
    if (result === "failed") {
      return;
    }
    const { version, todos } = result;
    refVersion.current = version;
    setState({
      todos: createTodosMap(todos),
      key: "0"
    });
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
      setState({
        todos: createTodosMap(todos),
        key: state.key === "0" ? "1" : "0"
      })
      return "done";
    }
    return result;
  }

  async function removeTodo(key) {
    // Disable the todo while it is being deleted so that the user can't edit
    // it or delete it a second time.
    state.todos.get(key).disabled = true;
    setState({ ...state })
    const result = await enqueue(() => post("delete", { key }));
    if (result === "done") {
      return;
    }
    state.todos.delete(key);
    setState({ ...state });
  }

  async function appendTodo() {
    const result = await enqueue(() => post("append"));
    if (result === "done") {
      return;
    }
    state.todos.set(result.key, {
      inputRef: React.createRef(),
      initialValue: "",
      disabled: false
    });
    setState({ ...state });
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
    // We leave the TextFields uncontrolled to avoid re-rendering the entire
    // list every time the user types. A ref is passed to each TextField so
    // that we can access the TextField's value.
    state.todos.forEach(({ inputRef, initialValue, disabled }, key) => listItems.push(
      <ListItem key={key}>
        <TextField
          multiline
          fullWidth
          size="small"
          placeholder="Item"
          spellcheck="false"
          inputRef={inputRef}
          defaultValue={initialValue}
        />
        <IconButton onClick={disabled ? undefined : () => removeTodo(key)}>
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
    <List key={state.key} >
      {listItems}
    </List>
  );
}

function createTodosMap(todos) {
  const todosMap = new Map();
  for (const [key, value] of todos) {
    todosMap.set(key, {
      inputRef: React.createRef(),
      initialValue: value,
      disabled: false
    });
  }
  return todosMap;
}
