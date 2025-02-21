import { ReactNode, useContext } from "react"
import { AppState } from "./app";
import { AppStateContext } from "./appStateContext";

export type AppStateConsumerProps = {
  getNodeFromState: (state: AppState) => ReactNode;
};

/**
 * AppStateConsumers render whenever the AppState in AppStateContext changes.
 */
export function AppStateConsumer({ getNodeFromState }: AppStateConsumerProps) {
  const state = useContext(AppStateContext);
  return getNodeFromState(state);
}