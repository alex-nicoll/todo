import Logout from "@mui/icons-material/Logout";
import { Box, IconButton, Typography } from "@mui/material";
import { ActionTag } from "./actions";
import { callApiNoParse } from "./api";
import { AppBarRightFsm, StateTag } from "./appBarRightFsm";
import { assertNever } from "./assertNever";
import { Dispatcher } from "./dispatcher";
import { useSubscribe } from "./publisher";

type AppBarRightProps = {
  fsm: AppBarRightFsm;
  apiUrl: string;
  dispatcher: Dispatcher;
};

export function AppBarRight({ fsm, apiUrl, dispatcher }: AppBarRightProps) {
  console.log("rendering AppBarRight");

  useSubscribe(fsm);

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
  if (state.tag === StateTag.Empty) {
    return undefined;
  }
  if (state.tag === StateTag.User) {
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
