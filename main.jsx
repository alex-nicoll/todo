import * as React from "react";
import * as ReactDOM from "react-dom";
import {
  Alert,
  Box,
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
import { newTodoStore } from "./todoStore.jsx"

init();

function init() {
  const apiURL = `${document.location.origin}/api`;
  const todoStore = newTodoStore(apiURL);
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(
    <Container maxWidth="sm">
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <Typography variant="h3" component="h1">
          To-Do
        </Typography>
        <Typography>
          <SyncIndicator todoStore={todoStore} />
        </Typography>
      </Box>
      <TodoList todoStore={todoStore} />
    </Container>
  );
}

function SyncIndicator({ todoStore }) {
  console.log("rendering SyncIndicator");

  const [_, setState] = React.useState({});
  React.useEffect(
    () => todoStore.syncIndicatorDidMount(() => setState({})),
    []
  );

  return todoStore.isSyncing() ? "Syncing..." : undefined;
}

function TodoList({ todoStore }) {
  console.log("rendering TodoList");

  const [_, setState] = React.useState({});
  React.useEffect(
    () => todoStore.listDidMount(() => setState({})),
    []
  );

  const state = todoStore.getState();
  console.log(state);

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
    state.forEach((value, key) => listItems.push(
      <ListItem key={key}>
        <TodoTextField
          todoKey={key}
          todoStore={todoStore}
        />
        <IconButton onClick={() => todoStore.deleteTodo(key)}>
          <Clear />
        </IconButton>
      </ListItem>
    ));
    listItems.push(
      <ListItemButton onClick={todoStore.appendTodo}>
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

function TodoTextField({ todoKey, todoStore }) {
  console.log("rendering TodoTextField");

  const [_, setState] = React.useState({});
  React.useEffect(
    () => todoStore.textFieldDidMount(todoKey, () => setState({})),
    []
  );

  return (
    <TextField
      multiline
      fullWidth
      size="small"
      placeholder="Item"
      spellcheck="false"
      value={todoStore.getState().get(todoKey)}
      onChange={(e) => todoStore.updateTodo(todoKey, e.target.value)}
    />
  );
}
