import Add from "@mui/icons-material/Add";
import Clear from "@mui/icons-material/Clear";
import Logout from "@mui/icons-material/Logout";
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
import { cyan, indigo } from '@mui/material/colors';
import { ThemeProvider, createTheme } from "@mui/material/styles";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { ActionTag } from "./actions";
import { callApi, callApiNoParse } from "./api";
import { AppBarCenterFsm, StateTag as AppBarCenterStateTag, newAppBarCenterFsm } from "./appBarCenterFsm";
import { AppBarRightFsm, StateTag as AppBarRightStateTag, newAppBarRightFsm } from "./appBarRightFsm";
import { assertNever } from "./assertNever";
import { ContentFsm, StateTag as ContentStateTag, newContentFsm } from "./contentFsm";
import { Dispatcher, newDispatcher } from "./dispatcher";
import { SyncStore, newSyncStore } from "./syncStore";
import { TodoStore, newTodoStore, newTodosMap } from "./todoStore";

init();

function init() {
  const apiUrl = `${document.location.origin}/api`;
  const appBarCenterFsm = newAppBarCenterFsm();
  const appBarRightFsm = newAppBarRightFsm();
  const contentFsm = newContentFsm();
  const dispatcher = newDispatcher(appBarCenterFsm, appBarRightFsm, contentFsm);
  loadInitialState(apiUrl, dispatcher);
  const root = ReactDOM.createRoot(document.getElementById("root")!);
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

async function loadInitialState(apiUrl: string, dispatcher: Dispatcher) {
  const result = await callApi(apiUrl, "getUsername");
  if (result === "failed") {
    dispatcher.dispatch({ tag: ActionTag.GetUsernameError});
    return;
  }
  const { username } = result;
  if (username === "") {
    dispatcher.dispatch({ tag: ActionTag.UsernameNotLoaded });
    return;
  }
  dispatcher.dispatch({ tag: ActionTag.UsernameLoaded, username });
  loadTodos(apiUrl, dispatcher);
}

async function loadTodos(apiUrl: string, dispatcher: Dispatcher) {
  const result = await callApi(apiUrl, "getTodos");
  if (result === "failed") {
    dispatcher.dispatch({ tag: ActionTag.GetTodosError });
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
    tag: ActionTag.TodosLoaded,
    todoStore,
    syncStore,
  });
}

type AppBarAndContentProps = {
  apiUrl: string;
  dispatcher: Dispatcher;
  appBarCenterFsm: AppBarCenterFsm;
  appBarRightFsm: AppBarRightFsm;
  contentFsm: ContentFsm;
};

function AppBarAndContent({
  apiUrl,
  dispatcher, 
  appBarCenterFsm,
  appBarRightFsm,
  contentFsm,
}: AppBarAndContentProps) {
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

// useSubscribeToFsm causes the calling Component to re-render whenever the
// given Fsm's state changes.
function useSubscribeToFsm(fsm: AppBarCenterFsm | AppBarRightFsm | ContentFsm) {
  const [, setState] = React.useState({});
  React.useEffect(
    () => fsm.subscribe(() => setState({})),
    []
  );
}

type AppBarCenterProps = {
  fsm: AppBarCenterFsm;
};

function AppBarCenter({ fsm }: AppBarCenterProps) {
  console.log("rendering AppBarCenter");

  useSubscribeToFsm(fsm);

  const state = fsm.getState();
  if (state.tag === AppBarCenterStateTag.Empty) {
    return undefined;
  }
  if (state.tag === AppBarCenterStateTag.Sync) {
    return (
      <Typography>
        <SyncText syncStore={state.syncStore} />
      </Typography>
    );
  }
  assertNever(state);
}

type AppBarRightProps = {
  fsm: AppBarRightFsm;
  apiUrl: string;
  dispatcher: Dispatcher;
};

function AppBarRight({ fsm, apiUrl, dispatcher }: AppBarRightProps) {
  console.log("rendering AppBarRight");

  useSubscribeToFsm(fsm);

  async function logout() {
    dispatcher.dispatch({ tag: ActionTag.LogoutClicked });
    const result = await callApiNoParse(apiUrl, "logout");
    if (result === "failed") {
      dispatcher.dispatch({ tag: ActionTag.LogoutError });
      return;
    }
    dispatcher.dispatch({ tag: ActionTag.LoggedOut });
  }

  const state = fsm.getState();
  if (state.tag === AppBarRightStateTag.Empty) {
    return undefined;
  }
  if (state.tag === AppBarRightStateTag.User) {
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
  assertNever(state);
}

type ContentProps = { 
  fsm: ContentFsm;
  apiUrl: string;
  dispatcher: Dispatcher;
};

function Content({ fsm, apiUrl, dispatcher }: ContentProps) {
  console.log("rendering Content");

  useSubscribeToFsm(fsm);

  const state = fsm.getState();
  if (state.tag === ContentStateTag.LoadingUsername ||
    state.tag === ContentStateTag.LoadingTodos ||
    state.tag === ContentStateTag.LoggingOut) {
    return (
      <Box sx={{ padding: "24px 0", display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }
  if (state.tag === ContentStateTag.Error) {
    return (
      <Box sx={{ padding: "16px 0" }}>
        <Alert severity="error">
          There was a problem completing the requested action. If this problem
          persists, please try again later.
        </Alert>
      </Box>
    );
  }
  if (state.tag === ContentStateTag.Login) {
    return <LoginOrCreateUser apiUrl={apiUrl} dispatcher={dispatcher} />;
  }
  if (state.tag === ContentStateTag.Todos) {
    return <TodoList todoStore={state.todoStore} />
  }
  assertNever(state);
}

type LoginOrCreateUserProps = {
  apiUrl: string;
  dispatcher: Dispatcher;
};

function LoginOrCreateUser({ apiUrl, dispatcher }: LoginOrCreateUserProps) {
  console.log("rendering LoginOrCreateUser");

  const [isLogin, setIsLogin] = React.useState(true);

  function handleLoggedIn(username: string) {
    dispatcher.dispatch({ tag: ActionTag.LoggedIn, username });
    loadTodos(apiUrl, dispatcher);
  }

  function handleError() {
    dispatcher.dispatch({ tag: ActionTag.LoginError })
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

type LoginFormProps = {
  apiUrl: string;
  onShowCreateUserForm: () => void;
  onLoggedIn: (username: string) => void;
  onError: () => void;
};

function LoginForm({ apiUrl, onShowCreateUserForm, onLoggedIn, onError }: LoginFormProps) {
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

type CreateUserFormProps = {
  apiUrl: string;
  onShowLoginForm: () => void;
  onLoggedIn: (username: string) => void;
  onError: () => void;
};

function CreateUserForm({ apiUrl, onShowLoginForm, onLoggedIn, onError }: CreateUserFormProps) {
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

type SyncTextProps = {
  syncStore: SyncStore;
};

function SyncText({ syncStore }: SyncTextProps) {
  console.log("rendering SyncText");

  const [, setState] = React.useState({});
  React.useEffect(
    () => syncStore.subscribe(() => setState({})),
    []
  );

  return syncStore.isSyncing() ? "Syncing..." : undefined;
}

type TodoListProps = {
  todoStore: TodoStore;
};

function TodoList({ todoStore }: TodoListProps) {
  console.log("rendering TodoList");

  const [, setState] = React.useState({});
  React.useEffect(
    () => todoStore.subscribeToKeys(() => setState({})),
    []
  );

  const todoListItems: React.JSX.Element[] = [];
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

type TodoTextFieldProps = {
  todoId: string;
  todoStore: TodoStore;
};

function TodoTextField({ todoId, todoStore }: TodoTextFieldProps) {
  console.log("rendering TodoTextField");

  const [, setState] = React.useState({});
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
