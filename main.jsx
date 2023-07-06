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
  // state is "loading", "error", or an object with a single property "todos"
  // that contains a Map from key to input ref and initial value. The Map is
  // wrapped in an object so that we can trigger a re-render without copying
  // the entire Map.
  const [state, setState] = React.useState(() => ("loading"));
  const refVersion = React.useRef("");
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
    const todosMap = new Map();
    for (const [key, value] of todos) {
      todosMap.set(key, [React.createRef(), value]);
    }
    setState({ todos: todosMap });
  }

  function appendTodo() {
    const { todos } = state;
    todos.set(refNextKey.current, [React.createRef(), ""]);
    refNextKey.current++;
    setState({ todos });
  }

  function removeTodo(key) {
    const { todos } = state;
    todos.delete(key);
    setState({ todos });
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
    state.todos.forEach(([inputRef, initialValue], key) => listItems.push(
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
