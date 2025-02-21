import { createContext } from "react";
import { AppState } from "./app";

export const AppStateContext = createContext<AppState>({
  appBarCenter: undefined,
  appBarRight: undefined,
  content: undefined
});
