import ReactDOM from "react-dom/client";
import { ActionTag } from "./actions";
import { callApi } from "./api";
import { AppBarAndContent } from "./appBarAndContent";
import { newAppBarCenterFsm } from "./appBarCenterFsm";
import { newAppBarRightFsm } from "./appBarRightFsm";
import { newContentFsm } from "./contentFsm";
import { Dispatcher, newDispatcher } from "./dispatcher";
import { loadTodos } from "./loadTodos";

init();

function init() {
  const apiUrl = `${document.location.origin}/api`;
  const appBarCenterFsm = newAppBarCenterFsm();
  const appBarRightFsm = newAppBarRightFsm();
  const contentFsm = newContentFsm();
  const dispatcher = newDispatcher(appBarCenterFsm, appBarRightFsm, contentFsm);
  loadInitialState(apiUrl, dispatcher);
  const root = ReactDOM.createRoot(document.getElementById("root")!);
  root.render(
    <AppBarAndContent
      apiUrl={apiUrl}
      dispatcher={dispatcher}
      appBarCenterFsm={appBarCenterFsm}
      appBarRightFsm={appBarRightFsm}
      contentFsm={contentFsm}
    />
  );
}

async function loadInitialState(apiUrl: string, dispatcher: Dispatcher) {
  const result = await callApi(apiUrl, "getUsername");
  if (result === "failed") {
    dispatcher.dispatch({ tag: ActionTag.GetUsernameError});
    return;
  }
  const { username } = result;
  if (username === "") {
    dispatcher.dispatch({ tag: ActionTag.UsernameNotLoaded });
    return;
  }
  dispatcher.dispatch({ tag: ActionTag.UsernameLoaded, username });
  loadTodos(apiUrl, dispatcher);
}
