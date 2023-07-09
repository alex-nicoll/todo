import * as React from "react";
import * as ReactDOM from "react-dom";
import {
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
  const refVersion = React.useRef(undefined);
  const refNextKey = React.useRef(0);
  React.useEffect(getTodos, []);

  console.log(state);

  async function getTodos() {
    const resp = await fetch(apiURL, { method: "GET" });
    if (!resp.ok) {
      setState("error");
      return;
    }
    const { version, todos } = await resp.json();
    refVersion.current = version;
    setState({
      todos: createTodosMap(todos),
      key: "0"
    });
  }

  async function removeTodo(key) {
    setDisabled(key, true);
    const resp = await fetch(apiURL, {
      method: "POST",
      body: JSON.stringify({
        operation: "delete",
        version: refVersion.current,
        key
      })
    });
    if (!resp.ok) {
      setDisabled(key, false);
      return;
    }
    const j = await resp.json();
    console.log(j);
    const {version, todos} = j;
    refVersion.current = version;
    if (todos !== undefined) {
      setState({
        todos: createTodosMap(todos),
        key: state.key === "0" ? "1" : "0"
      })
      return;
    }
    state.todos.delete(key);
    setState({ todos: state.todos, key: state.key });
  }

  function setDisabled(key, disabled) {
    state.todos.get(key).disabled = disabled;
    setState({ todos: state.todos, key: state.key })
  }

  function appendTodo() {
    const { todos, key } = state;
    todos.set(refNextKey.current, [React.createRef(), ""]);
    refNextKey.current++;
    setState({ todos, key });
  }

  if (state === "error") {
    return "There was a problem loading the list. Please try again later.";
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
