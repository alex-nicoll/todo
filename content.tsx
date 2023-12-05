import { Alert, Box, CircularProgress } from "@mui/material";
import { assertNever } from "./assertNever";
import { ContentFsm, StateTag } from "./contentFsm";
import { Dispatcher } from "./dispatcher";
import { LoginOrCreateUser } from "./loginOrCreateUser";
import { TodoList } from "./todoList";
import { useSubscribeToFsm } from "./useSubscribeToFsm";

type ContentProps = { 
  fsm: ContentFsm;
  apiUrl: string;
  dispatcher: Dispatcher;
};

export function Content({ fsm, apiUrl, dispatcher }: ContentProps) {
  console.log("rendering Content");

  useSubscribeToFsm(fsm);

  const state = fsm.getState();
  if (state.tag === StateTag.LoadingUsername ||
    state.tag === StateTag.LoadingTodos ||
    state.tag === StateTag.LoggingOut) {
    return (
      <Box sx={{ padding: "24px 0", display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }
  if (state.tag === StateTag.Error) {
    return (
      <Box sx={{ padding: "16px 0" }}>
        <Alert severity="error">
          There was a problem completing the requested action. If this problem
          persists, please try again later.
        </Alert>
      </Box>
    );
  }
  if (state.tag === StateTag.Login) {
    return <LoginOrCreateUser apiUrl={apiUrl} dispatcher={dispatcher} />;
  }
  if (state.tag === StateTag.Todos) {
    return <TodoList todoStore={state.todoStore} />
  }
  assertNever(state);
}