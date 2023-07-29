import * as React from "react";
import * as ReactDOM from "react-dom";
import {
  Alert,
  AppBar,
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
import { indigo, cyan } from '@mui/material/colors';
import { createTheme, ThemeProvider } from "@mui/material/styles";
import Add from "@mui/icons-material/Add";
import Clear from "@mui/icons-material/Clear";
import { newTodoStore } from "./todoStore.jsx";
import { newSyncStore } from "./syncStore.jsx";

init();

function init() {
  const apiURL = `${document.location.origin}/api`;
  const syncStore = newSyncStore();
  const todoStore = newTodoStore(apiURL, syncStore);
  const theme = createTheme({
    palette: {
      primary: indigo,
      secondary: cyan
    }
  });
  const appBarHeight = "60px";
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(
    <ThemeProvider theme={theme}>
      <Container maxWidth="sm" sx={{ paddingTop: appBarHeight }}>
        <AppBar
            sx={{
              height: appBarHeight,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              padding: "0 5%"
            }}
        >
          <Box sx={{ flex: "1", display: "flex", justifyContent: "left" }}>
            <Typography variant="h4" component="h1">
              To-Do
            </Typography>
          </Box>
          <Box sx={{ flex: "1", display: "flex", justifyContent: "center" }}>
            <Typography>
              <SyncIndicator syncStore={syncStore} />
            </Typography>
          </Box>
          <Box sx={{ flex: "1", display: "flex", justifyContent: "right" }}>
            <Typography>
              Logout
            </Typography>
          </Box>
        </AppBar>
        <TodoList todoStore={todoStore} />
      </Container>
    </ThemeProvider>
  );
}

function SyncIndicator({ syncStore }) {
  console.log("rendering SyncIndicator");

  const [_, setState] = React.useState({});
  React.useEffect(
    () => syncStore.syncIndicatorDidMount(() => setState({})),
    []
  );

  return syncStore.isSyncing() ? "Syncing..." : undefined;
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
    state.forEach((value, id) => listItems.push(
      <ListItem key={id}>
        <TodoTextField
          todoId={id}
          todoStore={todoStore}
        />
        <IconButton onClick={() => todoStore.deleteTodo(id)}>
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

function TodoTextField({ todoId, todoStore }) {
  console.log("rendering TodoTextField");

  const [_, setState] = React.useState({});
  React.useEffect(
    () => todoStore.textFieldDidMount(todoId, () => setState({})),
    []
  );

  return (
    <TextField
      multiline
      fullWidth
      size="small"
      placeholder="Item"
      spellcheck="false"
      value={todoStore.getState().get(todoId)}
      onChange={(e) => todoStore.updateTodo(todoId, e.target.value)}
    />
  );
}
