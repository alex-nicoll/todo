import * as React from "react";
import * as ReactDOM from "react-dom";
import {
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
  const [state, setState] = React.useState(() => ({ todos: new Map() }));
  const refNextKey = React.useRef(0);

  console.log(state);

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

  // We leave the TextFields uncontrolled to avoid re-rendering the entire list
  // every time the user types. A ref is passed to each TextField so that we
  // can access the TextField's value.
  const todoElements = [];
  state.todos.forEach((inputRef, key) => todoElements.push(
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

  return (
    <List>
      {todoElements}
      <ListItemButton onClick={appendTodo}>
        <ListItemIcon>
          <Add />
        </ListItemIcon>
        <ListItemText primary="New item" />
      </ListItemButton>
    </List>
  );
}
