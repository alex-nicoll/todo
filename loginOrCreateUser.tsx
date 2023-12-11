import { LoadingButton } from "@mui/lab";
import { Box, Button, TextField, Typography } from "@mui/material";
import React from "react";
import { ActionTag } from "./actions";
import { callApi } from "./api";
import { Dispatcher } from "./dispatcher";
import { loadTodos } from "./loadTodos";

type LoginOrCreateUserProps = {
  apiUrl: string;
  dispatcher: Dispatcher;
};

export function LoginOrCreateUser({ apiUrl, dispatcher }: LoginOrCreateUserProps) {
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

  const isLoginDisabled = state.username === "" || state.password === "";

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.code === "Enter" && !isLoginDisabled) {
      login();
    }
  }

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
        onKeyDown={handleKeyDown}
      />
      <TextField
        sx={style}
        spellCheck={false}
        label="Password"
        value={state.password}
        onChange={(e) => setState({ ...state, password: e.target.value })}
        onKeyDown={handleKeyDown}
        type={"password"}
      />
      {invalidIndicator}
      <LoadingButton
        sx={style}
        disabled={isLoginDisabled}
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

  const isCreateUserDisabled = state.username === "" || state.password === "" || state.confirmPassword === "";

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.code === "Enter" && !isCreateUserDisabled) {
      createUser();
    }
  }

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
        onKeyDown={handleKeyDown}
        {...usernameProps}
      />
      <TextField
        sx={style}
        spellCheck={false}
        label="Password"
        value={state.password}
        onChange={(e) => setState({ ...state, password: e.target.value })}
        onKeyDown={handleKeyDown}
        type={"password"}
        {...passwordProps}
      />
      <TextField
        sx={style}
        spellCheck={false}
        label="Confirm password"
        value={state.confirmPassword}
        onChange={(e) => setState({ ...state, confirmPassword: e.target.value })}
        onKeyDown={handleKeyDown}
        type={"password"}
        {...passwordProps}
      />
      <LoadingButton
        sx={style}
        disabled={isCreateUserDisabled}
        loading={state.isCreatingUser}
        onClick={createUser}
      >
        Create account
      </LoadingButton>
    </Box>
  );
}