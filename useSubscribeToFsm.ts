import React from "react";
import { AppBarCenterFsm } from "./appBarCenterFsm";
import { AppBarRightFsm } from "./appBarRightFsm";
import { ContentFsm } from "./contentFsm";

/**
 * useSubscribeToFsm causes the calling Component to re-render whenever the
 * given Fsm's state changes.
 */
export function useSubscribeToFsm(fsm: AppBarCenterFsm | AppBarRightFsm | ContentFsm) {
  const [, setState] = React.useState({});
  React.useEffect(
    () => fsm.subscribe(() => setState({})),
    []
  );
}
