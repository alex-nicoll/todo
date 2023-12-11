import { SyncStore } from "./syncStore";
import { useSubscribe } from "./publisher";

type SyncTextProps = {
  syncStore: SyncStore;
};

export function SyncText({ syncStore }: SyncTextProps) {
  console.log("rendering SyncText");

  useSubscribe(syncStore);

  return syncStore.isSyncing() ? "Syncing..." : undefined;
}
