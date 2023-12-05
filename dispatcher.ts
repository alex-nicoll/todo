import { Action } from "./actions";
import { AppBarCenterFsm } from "./appBarCenterFsm";
import { AppBarRightFsm } from "./appBarRightFsm";
import { ContentFsm } from "./contentFsm";

export type Dispatcher = ReturnType<typeof newDispatcher>;

export function newDispatcher(
  appBarCenterFsm: AppBarCenterFsm,
  appBarRightFsm: AppBarRightFsm,
  contentFsm: ContentFsm
) {
  
  function dispatch(action: Action) {
    appBarCenterFsm.dispatch(action);
    appBarRightFsm.dispatch(action);
    contentFsm.dispatch(action);
  }

  return { dispatch }
}
