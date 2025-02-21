import { LoadingButton } from "@mui/lab";
import { Box, Button, TextField, Typography } from "@mui/material";
import { useContext, useState } from "react";
import { ActionsContext } from "./actionsContext";

export type LoginOrCreateUserProps = {
  onLoggedIn: (username: string) => void;
};

export function LoginOrRegister({ onLoggedIn }: LoginOrCreateUserProps) {

  const [isLogin, setIsLogin] = useState(true);

  if (isLogin) {
    return (
      <LoginForm
        onShowCreateUserForm={() => setIsLogin(false)}
        onLoggedIn={onLoggedIn}
      />
    );
  }
  return (
    <CreateUserForm
      onShowLoginForm={() => setIsLogin(true)}
      onLoggedIn={onLoggedIn}
    />
  );
}

type LoginFormProps = {
  onShowCreateUserForm: () => void;
  onLoggedIn: (username: string) => void;
};

function LoginForm({ onShowCreateUserForm, onLoggedIn }: LoginFormProps) {

  const [state, setState] = useState({
    username: "",
    password: "",
    isLoggingIn: false,
    isInvalid: false
  });

  const actions = useContext(ActionsContext);

  const isLoginDisabled = state.username === "" || state.password === "";

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.code === "Enter" && !isLoginDisabled) {
      login();
    }
  }

  async function login() {
    setState({ ...state, isLoggingIn: true });
    const { username, password } = state;
    actions.login({
      username,
      password,
      onCredentialsRejected: () => setState({ ...state, isInvalid: true }),
      onLoggedIn: () => onLoggedIn(username)
    })
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
  onShowLoginForm: () => void;
  onLoggedIn: (username: string) => void;
};

function CreateUserForm({ onShowLoginForm, onLoggedIn }: CreateUserFormProps) {

  const [state, setState] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    isCreatingUser: false,
    isUsernameTaken: false,
  });

  const actions = useContext(ActionsContext);

  const isCreateUserDisabled = state.username === "" || state.password === "" || state.confirmPassword === "";

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.code === "Enter" && !isCreateUserDisabled) {
      createUser();
    }
  }

  async function createUser() {
    setState({ ...state, isCreatingUser: true });
    const { username, password } = state;
    actions.register({
      username,
      password,
      onUsernameTaken: () => setState({ ...state, isUsernameTaken: true }),
      onLoggedIn: () => onLoggedIn(username)
    })
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