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
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(
    <Container maxWidth="sm">
      <Typography variant="h3" component="h1">
        To-Do
      </Typography>
      <TodoList />
    </Container>
  );
}

function TodoList() {
  // state.todos is a Map from key to input ref. The Map is wrapped in an
  // object so that we can trigger a re-render without copying the entire Map.
  const [state, setState] = React.useState(() => ({ todos: undefined }));
  const refNextKey = React.useRef(0);
  React.useEffect(getTodos, []);

  console.log(state);

  async function getTodos() {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setState({ todos: new Map() });
  }

  function appendTodo() {
    const { todos } = state;
    todos.set(refNextKey.current, React.createRef());
    refNextKey.current++;
    setState({ todos });
  }

  function removeTodo(key) {
    const { todos } = state;
    todos.delete(key);
    setState({ todos });
  }

  function createListItems() {
    if (state.todos === undefined) {
      return (
        <ListItem sx={{ justifyContent: "center" }} >
          <CircularProgress />
        </ListItem>
      );
    }
    const listItems = [];
    // We leave the TextFields uncontrolled to avoid re-rendering the entire
    // list every time the user types. A ref is passed to each TextField so
    // that we can access the TextField's value.
    state.todos.forEach((inputRef, key) => listItems.push(
      <ListItem key={key}>
        <TextField
          multiline
          fullWidth
          size="small"
          placeholder="Item"
          spellcheck="false"
          inputRef={inputRef}
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
    return listItems;
  }

  return (
    <List>
      {createListItems()}
    </List>
  );
}
