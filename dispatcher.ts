import { Action, ActionTag } from "./actions";

type Handler = (a: Action) => void;

export type Dispatcher = ReturnType<typeof newDispatcher>;

export function newDispatcher() {

  const handlerMap = new Map<ActionTag, Set<Handler>>();

  // register associates a Handler with an ActionTag. register returns a
  // function that unregisters the Handler.
  function register(tag: ActionTag, handler: Handler) {
    let h = handlerMap.get(tag);
    if (h === undefined) {
      h = new Set();
      handlerMap.set(tag, h);
    }
    h.add(handler);
    return () => {
      h!.delete(handler);
      if (h!.size === 0) {
        handlerMap.delete(tag);
      }
    }
  }

  // dispatch calls all Handlers associated with the given Action's tag.
  function dispatch(a: Action) {
    console.log(`dispatch ${ActionTag[a.tag]}`);
    const h = handlerMap.get(a.tag)
    if (h !== undefined) {
      h.forEach((handler) => handler(a));
    }
  }

  return {
    register,
    dispatch
  };
}
