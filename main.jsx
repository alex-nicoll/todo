import * as React from "react";
import * as ReactDOM from "react-dom";
import { LoadingButton } from "@mui/lab";
import {
  Alert,
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  CssBaseline,
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
import Logout from "@mui/icons-material/Logout";
import { fetchObject, newPost } from "./fetchUtil.js";
import { newTodoStore } from "./todoStore.jsx";
import { newSyncStore } from "./syncStore.jsx";

init();

function init() {
  const apiUrl = `${document.location.origin}/api`;
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(<App apiUrl={apiUrl} />);
}

function App({ apiUrl }) {
  console.log("rendering App");

  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  if (!isLoggedIn) {
    return (
      <AppBarAndContent
        content={
          <LoginForm apiUrl={apiUrl} onLoggedIn={() => setIsLoggedIn(true)} />
        }
      />
    );
  }
  const syncStore = newSyncStore();
  const todoStore = newTodoStore(apiUrl, syncStore);
  return (
    <AppBarAndContent
      appBarCenterText={<SyncText syncStore={syncStore} />}
      appBarRight={<Account onLogout={() => setIsLoggedIn(false)} />}
      content={<TodoList todoStore={todoStore} />}
    />
  );
}

function AppBarAndContent({ appBarCenterText, appBarRight, content }) {
  const theme = createTheme({
    palette: {
      primary: indigo,
      secondary: cyan,
      contrastThreshold: 4.5,
    }
  });
  const appBarHeight = "60px";
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
            {appBarCenterText}
          </Typography>
        </Box>
        <Box sx={{ flex: "1", display: "flex", justifyContent: "right" }}>
          {appBarRight}
        </Box>
      </AppBar>
      <Container maxWidth="sm" sx={{ marginTop: appBarHeight }}>
        {content}
      </Container>
    </ThemeProvider>
  );
}

function LoginForm({ apiUrl, onLoggedIn }) {
  console.log("rendering LoginForm");

  const [state, setState] = React.useState({
    username: "",
    password: "",
    isLoggingIn: false,
    isInvalid: false
  });

  async function login() {
    setState({ ...state, isLoggingIn: true });
    const { username, password } = state;
    const result = await fetchObject(
      apiUrl,
      newPost("login", { username, password })
    );
    if (result === "failed") {
      setState("error");
      return;
    }
    if (result.token === undefined) {
      setState({ ...state, isInvalid: true });
      return;
    }
    onLoggedIn();
  }

  if (state === "error") {
    return <ActionFailedAlert />;
  }

  const style = { margin: "10px 0" };
  let invalidIndicator = undefined;
  if (state.isInvalid) {
    invalidIndicator = (
      <Typography sx={style}>
        Invalid username or password.
      </Typography>
    );
  }
  return (
    <Box 
      sx={{
        padding: "8px 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center" 
      }}
    >
      <Typography sx={style} variant="h5">
        Sign in
      </Typography>
      <TextField
        sx={style}
        spellcheck={false}
        label="Username"
        value={state.username}
        onChange={(e) => setState({ ...state, username: e.target.value })}
      />
      <TextField
        sx={style}
        spellcheck={false}
        label="Password"
        value={state.password}
        onChange={(e) => setState({ ...state, password: e.target.value })}
        type={"password"}
      />
      {invalidIndicator}
      <LoadingButton
        sx={style}
        disabled={state.username === "" || state.password === ""}
        loading={state.isLoggingIn}
        onClick={login}
      >
        Sign in
      </LoadingButton>
    </Box>
  );
}

function Account({ onLogout }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <Typography>
        default
      </Typography>
      <IconButton sx={{ color: "#ffffff" }} onClick={onLogout}>
        <Logout />
      </IconButton>
    </Box>
  );
}

function SyncText({ syncStore }) {
  console.log("rendering SyncText");

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
    return <ActionFailedAlert />;
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

function ActionFailedAlert() {
  return (
    <Box sx={{ padding: "16px 0" }}>
      <Alert severity="error">
        There was a problem completing the requested action. If this problem
        persists, please try again later.
      </Alert>
    </Box>
  );
}
