import React from "react";
import { SyncStore } from "./syncStore";

type SyncTextProps = {
  syncStore: SyncStore;
};

export function SyncText({ syncStore }: SyncTextProps) {
  console.log("rendering SyncText");

  const [, setState] = React.useState({});
  React.useEffect(
    () => syncStore.subscribe(() => setState({})),
    []
  );

  return syncStore.isSyncing() ? "Syncing..." : undefined;
}
