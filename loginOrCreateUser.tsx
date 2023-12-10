import { LoadingButton } from "@mui/lab";
import { Box, Button, TextField, Typography } from "@mui/material";
import React from "react";
import { ActionTag } from "./actions";
import { callApi } from "./api";
import { Dispatcher } from "./dispatcher";
import { loadTodos } from "./loadTodos";

type LoginFormState = {
  isLogin: true;
  username: string; 
  password: string;
  isLoggingIn: boolean;
  isInvalid: boolean;
};

function newLoginFormState(): LoginFormState {
  return {
    isLogin: true,
    username: "",
    password: "",
    isLoggingIn: false,
    isInvalid: false
  };
}

function isLoginDisabled(state: LoginFormState) {
  return state.username === "" || state.password === "";
}

type CreateUserFormState = {
  isLogin: false;
  username: string;
  password: string;
  confirmPassword: string;
  isCreatingUser: boolean;
  isUsernameTaken: boolean;
};

function newCreateUserFormState(): CreateUserFormState {
  return {
    isLogin: false,
    username: "",
    password: "",
    confirmPassword: "",
    isCreatingUser: false,
    isUsernameTaken: false,
  };
}

function isCreateUserDisabled(state: CreateUserFormState) {
  return state.username === "" || state.password === "" || state.confirmPassword === "";
}

type LoginOrCreateUserState = LoginFormState | CreateUserFormState;

type LoginOrCreateUserProps = {
  apiUrl: string;
  dispatcher: Dispatcher;
};

export function LoginOrCreateUser({ apiUrl, dispatcher }: LoginOrCreateUserProps) {
  console.log("rendering LoginOrCreateUser");

  const [state, setState] = React.useState<LoginOrCreateUserState>(newLoginFormState);

  React.useEffect(() => {

    function handleKeyDown(ev: KeyboardEvent) {
      if (ev.code !== "Enter") {
        return;
      }
      if (state.isLogin) {
        if (!isLoginDisabled(state)) {
          login({ apiUrl, dispatcher, state, setState });
        }
      } else {
        if (!isCreateUserDisabled(state)) {
          createUser({ apiUrl, dispatcher, state, setState });
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (state.isLogin) {
    return (
      <LoginForm
        state={state}
        setState={setState}
        onLogin={() => login({ apiUrl, dispatcher, state, setState })}
        onShowCreateUserForm={() => setState(newCreateUserFormState())}
      />
    );
  }
  return (
    <CreateUserForm
      state={state}
      setState={setState}
      onCreateUser={() => createUser({ apiUrl, dispatcher, state, setState })}
      onShowLoginForm={() => setState(newLoginFormState())}
    />
  );
}

type LoginArgs = {
  apiUrl: string;
  dispatcher: Dispatcher
  state: LoginFormState;
  setState: (state: LoginFormState) => void;
};

async function login({ apiUrl, dispatcher, state, setState }: LoginArgs) {
  setState({ ...state, isLoggingIn: true });
  const { username, password } = state;
  const result = await callApi(apiUrl, "login", { username, password });
  if (result === "failed") {
    dispatcher.dispatch({ tag: ActionTag.LoginError })
    return;
  }
  if (result.didLogin === false) {
    // The operation succeeded but the user's credentials were rejected.
    setState({ ...state, isInvalid: true });
    return;
  }
  dispatcher.dispatch({ tag: ActionTag.LoggedIn, username });
  loadTodos(apiUrl, dispatcher);
}

type CreateUserArgs = {
  apiUrl: string;
  dispatcher: Dispatcher
  state: CreateUserFormState;
  setState: (state: CreateUserFormState) => void;
};

async function createUser({ apiUrl, dispatcher, state, setState }: CreateUserArgs) {
  setState({ ...state, isCreatingUser: true });
  const { username, password } = state;
  const result = await callApi(apiUrl, "createUser", { username, password });
  if (result === "failed") {
    dispatcher.dispatch({ tag: ActionTag.LoginError })
    return;
  }
  if (result.isNameTaken) {
    setState({ ...state, isUsernameTaken: true });
    return;
  }
  dispatcher.dispatch({ tag: ActionTag.LoggedIn, username });
  loadTodos(apiUrl, dispatcher);
}

type LoginFormProps = {
  state: LoginFormState;
  setState: (state: LoginFormState) => void;
  onLogin: () => void;
  onShowCreateUserForm: () => void;
};

function LoginForm({ state, setState, onLogin, onShowCreateUserForm }: LoginFormProps) {

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
        disabled={isLoginDisabled(state)}
        loading={state.isLoggingIn}
        onClick={onLogin}
      >
        Sign in
      </LoadingButton>
    </Box>
  );
}

type CreateUserFormProps = {
  state: CreateUserFormState;
  setState: (state: CreateUserFormState) => void;
  onCreateUser: () => void;
  onShowLoginForm: () => void;
};

function CreateUserForm({ state, setState, onCreateUser, onShowLoginForm }: CreateUserFormProps) {

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
        disabled={isCreateUserDisabled(state)}
        loading={state.isCreatingUser}
        onClick={onCreateUser}
      >
        Create account
      </LoadingButton>
    </Box>
  );
}