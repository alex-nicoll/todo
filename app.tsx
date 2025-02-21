import { ReactNode, useContext, useEffect, useState } from "react";
import { AppBarAndContent } from "./appBarAndContent";
import { ActionsContext } from "./actionsContext";
import { AppStateContext } from "./appStateContext";
import { AccountControl } from "./accountControl";
import { LoadingAnimation } from "./loadingAnimation";
import { LoginOrRegister } from "./loginOrRegister";
import { noop } from "./noop";
import { Todos } from "./todos";
import { Alert, Box, Typography } from "@mui/material";
import { createTaskQueue } from "./taskQueue";

export type AppState = {
  content: ReactNode;
  appBarCenter: ReactNode;
  appBarRight: ReactNode;
};

export function App() {
  const [state, setState] = useState<AppState>({
    appBarCenter: undefined,
    appBarRight: undefined,
    content: <LoadingAnimation />
  });
  const actions = useContext(ActionsContext);

  useEffect(() => {
    const taskQueue = createTaskQueue({
      onSyncStarted: handleSyncStarted,
      onSyncDone: handleSyncDone,
      onTaskError: handleTaskError
    });

    taskQueue.addTask({
      run: () => actions.checkLoginStatus({
        onLoggedIn: handleLoggedIn,
        onLoggedOut: handleLoggedOut
      }),
      isSync: false
    });

    function handleLoggedIn(username: string) {
      setState({
        appBarCenter: undefined,
        appBarRight: (
          <AccountControl
            username={username}
            onLogoutClicked={() => handleLogoutClicked(username)}
          />
        ),
        content: <Todos taskQueue={taskQueue} />
      });
    }

    function handleLoggedOut() {
      setState({
        appBarCenter: undefined,
        appBarRight: undefined,
        content: <LoginOrRegister onLoggedIn={handleLoggedIn} />
      });
    }

    function handleLogoutClicked(username: string) {
      setState({
        appBarCenter: undefined,
        appBarRight: (
          <AccountControl
            username={username}
            onLogoutClicked={noop}
          />
        ),
        content: <LoadingAnimation />
      });
      taskQueue.addTask({
        run: () => actions.logout({
          onLoggedOut: handleLoggedOut
        }),
        isSync: false
      });
    }

    function handleTaskError() {
      setState({
        appBarCenter: undefined,
        appBarRight: undefined,
        content: (
          <Box sx={{ padding: "16px 0" }}>
            <Alert severity="error">
              There was a problem communicating with the server.
            </Alert>
          </Box>
        )
      });
    }

    function handleSyncStarted() {
      setState((state) => ({
        ...state,
        appBarCenter: <Typography>Syncing...</Typography>
      }));
    }

    function handleSyncDone() {
      setState((state) => ({ ...state, appBarCenter: undefined }));
    }
  }, [actions])

  return (
    <AppStateContext.Provider value={state}>
      <AppBarAndContent />
    </AppStateContext.Provider>
  );
}