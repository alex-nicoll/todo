import ReactDOM from "react-dom/client";
import { ActionsContext } from "./actionsContext";
import { App } from "./app";
import { createActions } from "./actions";

init();

function init() {
  // Set up handling of uncaught errors.
  // window.addEventListener("unhandledrejection", (e) => {
  //   document.body.replaceChildren(e.reason);
  // });
  // window.addEventListener("error", (e) => {
  //   document.body.replaceChildren(e.message);
  // });

  const actions = createActions(`${document.location.origin}/api`);
  const root = ReactDOM.createRoot(document.getElementById("root")!);
  root.render(
    <ActionsContext.Provider value={actions}>
        <App />
    </ActionsContext.Provider>
  );
}