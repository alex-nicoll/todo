import * as React from "react";
import * as ReactDOM from "react-dom/client";
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
import { callApi, callApiNoParse } from "./api.js";
import { newAppBarCenterFsm } from "./appBarCenterFsm.js";
import { newAppBarRightFsm } from "./appBarRightFsm.js";
import { newContentFsm } from "./contentFsm.js";
import { newDispatcher } from "./dispatcher.js";
import { newTodosMap, newTodoStore } from "./todoStore.js";
import { newSyncStore } from "./syncStore.js";

init();

function init() {
  const apiUrl = `${document.location.origin}/api`;
  const dispatcher = newDispatcher();
  const appBarCenterFsm = newAppBarCenterFsm(dispatcher);
  const appBarRightFsm = newAppBarRightFsm(dispatcher);
  const contentFsm = newContentFsm(dispatcher);
  loadInitialState(apiUrl, dispatcher);
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(
    <AppBarAndContent
      apiUrl={apiUrl}
      dispatcher={dispatcher}
      appBarCenterFsm={appBarCenterFsm}
      appBarRightFsm={appBarRightFsm}
      contentFsm={contentFsm}
    />
  );
}

async function loadInitialState(apiUrl, dispatcher) {
  const result = await callApi(apiUrl, "getUsername");
  if (result === "failed") {
    dispatcher.dispatch({ id: "getUsernameError" });
    return;
  }
  const { username } = result;
  if (username === "") {
    dispatcher.dispatch({ id: "usernameNotLoaded" });
    return;
  }
  dispatcher.dispatch({ id: "usernameLoaded", username });
  loadTodos(apiUrl, dispatcher);
}

async function loadTodos(apiUrl, dispatcher) {
  const result = await callApi(apiUrl, "getTodos");
  if (result === "failed") {
    dispatcher.dispatch({ id: "getTodosError" });
    return;
  }
  const { version, todos } = result;
  const syncStore = newSyncStore();
  const todoStore = newTodoStore({
    apiUrl,
    dispatcher,
    syncStore,
    version,
    todos: newTodosMap(todos),
  });
  dispatcher.dispatch({
    id: "todosLoaded",
    todoStore,
    syncStore,
  });
}

function AppBarAndContent({
  apiUrl,
  dispatcher, 
  appBarCenterFsm,
  appBarRightFsm,
  contentFsm,
}) {
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
          <AppBarCenter fsm={appBarCenterFsm} />
        </Box>
        <Box sx={{ flex: "1", display: "flex", justifyContent: "right" }}>
          <AppBarRight
            fsm={appBarRightFsm}
            apiUrl={apiUrl}
            dispatcher={dispatcher}
          />
        </Box>
      </AppBar>
      <Container maxWidth="sm" sx={{ marginTop: appBarHeight }}>
        <Content fsm={contentFsm} apiUrl={apiUrl} dispatcher={dispatcher} />
      </Container>
    </ThemeProvider>
  );
}

function useSubscribeToFsm(fsm) {
  const [_, setState] = React.useState({});
  React.useEffect(
    () => fsm.subscribe(() => setState({})),
    []
  );
}

function AppBarCenter({ fsm }) {
  console.log("rendering AppBarCenter");

  useSubscribeToFsm(fsm);

  const state = fsm.getState();
  if (state.tag === "empty") {
    return undefined;
  }
  if (state.tag === "sync") {
    return (
      <Typography>
        <SyncText syncStore={state.syncStore} />
      </Typography>
    );
  }
  throw new Error(`No render logic defined for state "${state.tag}"`);
}

function AppBarRight({ fsm, apiUrl, dispatcher }) {
  console.log("rendering AppBarRight");

  useSubscribeToFsm(fsm);

  async function logout() {
    dispatcher.dispatch({ id: "logoutClicked" });
    const result = await callApiNoParse(apiUrl, "logout");
    if (result === "failed") {
      dispatcher.dispatch({ id: "logoutError" });
      return;
    }
    dispatcher.dispatch({ id: "loggedOut" });
  }

  const state = fsm.getState();
  if (state.tag === "empty") {
    return undefined;
  }
  if (state.tag === "user") {
    return (
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Typography>
          {state.username}
        </Typography>
        <IconButton sx={{ color: "#ffffff" }} onClick={logout}>
          <Logout />
        </IconButton>
      </Box>
    );
  }
  throw new Error(`No render logic defined for state "${state.tag}"`);
}

function Content({ fsm, apiUrl, dispatcher }) {
  console.log("rendering Content");

  useSubscribeToFsm(fsm);

  const state = fsm.getState();
  if (state.tag === "loadingUsername" ||
    state.tag === "loadingTodos" ||
    state.tag === "loggingOut") {
    return (
      <Box sx={{ padding: "24px 0", display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }
  if (state.tag === "error") {
    return (
      <Box sx={{ padding: "16px 0" }}>
        <Alert severity="error">
          There was a problem completing the requested action. If this problem
          persists, please try again later.
        </Alert>
      </Box>
    );
  }
  if (state.tag === "login") {
    return <LoginOrCreateUser apiUrl={apiUrl} dispatcher={dispatcher} />;
  }
  if (state.tag === "todos") {
    return <TodoList todoStore={state.todoStore} />
  }
  throw new Error(`No render logic defined for state "${state.tag}"`);
}

function LoginOrCreateUser({ apiUrl, dispatcher }) {
  console.log("rendering LoginOrCreateUser");

  const [isLogin, setIsLogin] = React.useState(true);

  function handleLoggedIn(username) {
    dispatcher.dispatch({ id: "loggedIn", username });
    loadTodos(apiUrl, dispatcher);
  }

  function handleError() {
    dispatcher.dispatch({ id: "loginError" })
  }

  if (isLogin) {
    return (
      <LoginForm
        apiUrl={apiUrl}
        onShowCreateUserForm={() => setIsLogin(false)}
        onLoggedIn={handleLoggedIn}
        onError={handleError}
      />
    );
  }
  return (
    <CreateUserForm
      apiUrl={apiUrl}
      onShowLoginForm={() => setIsLogin(true)}
      onLoggedIn={handleLoggedIn}
      onError={handleError}
    />
  );
}

function LoginForm({ apiUrl, onShowCreateUserForm, onLoggedIn, onError}) {
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
    const result = await callApi(apiUrl, "login", { username, password });
    if (result === "failed") {
      onError();
      return;
    }
    if (result.didLogin === false) {
      // The operation succeeded but the user's credentials were rejected.
      setState({ ...state, isInvalid: true });
      return;
    }
    onLoggedIn(username);
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
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
        }}
      >
        <Box sx={{ flex: "1", display: "flex", justifyContent: "left" }}>
          <Typography sx={style} variant="h5">
            Sign in
          </Typography>
        </Box>
        <Box sx={{ flex: "1", display: "flex", justifyContent: "right" }}>
          <Button onClick={onShowCreateUserForm}>
            Create account
          </Button>
        </Box>
      </Box>
      <TextField
        sx={style}
        spellCheck={false}
        label="Username"
        value={state.username}
        onChange={(e) => setState({ ...state, username: e.target.value })}
      />
      <TextField
        sx={style}
        spellCheck={false}
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

function CreateUserForm({ apiUrl, onShowLoginForm, onLoggedIn, onError}) {
  console.log("rendering CreateUserForm");

  const [state, setState] = React.useState({
    username: "",
    password: "",
    confirmPassword: "",
    isCreatingUser: false,
    isUsernameTaken: false,
  });

  async function createUser() {
    setState({ ...state, isCreatingUser: true });
    const { username, password } = state;
    const result = await callApi(apiUrl, "createUser", { username, password });
    if (result === "failed") {
      onError();
      return;
    }
    if (result.isNameTaken) {
      setState({ ...state, isUsernameTaken: true });
      return;
    }
    onLoggedIn(username);
  }

  let usernameProps;
  if (state.isUsernameTaken) {
    usernameProps = {
      error: true,
      helperText: "Username already taken.",
    }
  }
  let passwordProps;
  if (state.password !== state.confirmPassword) {
    passwordProps = {
      error: true,
      helperText: "Passwords must match.",
    }
  }
  const style = { margin: "10px 0" };
  return (
    <Box 
      sx={{
        padding: "8px 0",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
        }}
      >
        <Box sx={{ flex: "1", display: "flex", justifyContent: "left" }}>
          <Typography sx={style} variant="h5">
            Create account
          </Typography>
        </Box>
        <Box sx={{ flex: "1", display: "flex", justifyContent: "right" }}>
          <Button onClick={onShowLoginForm}>
            Sign in
          </Button>
        </Box>
      </Box>
      <TextField
        sx={style}
        spellCheck={false}
        label="Username"
        value={state.username}
        onChange={(e) => setState({ ...state, username: e.target.value })}
        {...usernameProps}
      />
      <TextField
        sx={style}
        spellCheck={false}
        label="Password"
        value={state.password}
        onChange={(e) => setState({ ...state, password: e.target.value })}
        type={"password"}
        {...passwordProps}
      />
      <TextField
        sx={style}
        spellCheck={false}
        label="Confirm password"
        value={state.confirmPassword}
        onChange={(e) => setState({ ...state, confirmPassword: e.target.value })}
        type={"password"}
        {...passwordProps}
      />
      <LoadingButton
        sx={style}
        disabled={state.username === "" || state.password === "" || state.confirmPassword === ""}
        loading={state.isCreatingUser}
        onClick={createUser}
      >
        Create account
      </LoadingButton>
    </Box>
  );
}
function SyncText({ syncStore }) {
  console.log("rendering SyncText");

  const [_, setState] = React.useState({});
  React.useEffect(
    () => syncStore.subscribe(() => setState({})),
    []
  );

  return syncStore.isSyncing() ? "Syncing..." : undefined;
}

function TodoList({ todoStore }) {
  console.log("rendering TodoList");

  const [_, setState] = React.useState({});
  React.useEffect(
    () => todoStore.subscribeToKeys(() => setState({})),
    []
  );

  let todoListItems = [];
  todoStore.getTodos().forEach((value, id) => todoListItems.push(
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

  return (
    <List>
      {todoListItems}
      <ListItemButton onClick={todoStore.appendTodo}>
        <ListItemIcon>
          <Add />
        </ListItemIcon>
        <ListItemText primary="New item" />
      </ListItemButton>
    </List>
  );
}

function TodoTextField({ todoId, todoStore }) {
  console.log("rendering TodoTextField");

  const [_, setState] = React.useState({});
  React.useEffect(
    () => todoStore.subscribeToValue(todoId, () => setState({})),
    []
  );

  return (
    <TextField
      multiline
      fullWidth
      size="small"
      placeholder="Item"
      spellCheck="false"
      value={todoStore.getTodos().get(todoId)}
      onChange={(e) => todoStore.updateTodo(todoId, e.target.value)}
    />
  );
}
