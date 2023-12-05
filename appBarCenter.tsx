import { Typography } from "@mui/material";
import { AppBarCenterFsm, StateTag } from "./appBarCenterFsm";
import { assertNever } from "./assertNever";
import { SyncText } from "./syncText";
import { useSubscribeToFsm } from "./useSubscribeToFsm";

type AppBarCenterProps = {
  fsm: AppBarCenterFsm;
};

export function AppBarCenter({ fsm }: AppBarCenterProps) {
  console.log("rendering AppBarCenter");

  useSubscribeToFsm(fsm);

  const state = fsm.getState();
  if (state.tag === StateTag.Empty) {
    return undefined;
  }
  if (state.tag === StateTag.Sync) {
    return (
      <Typography>
        <SyncText syncStore={state.syncStore} />
      </Typography>
    );
  }
  assertNever(state);
}
