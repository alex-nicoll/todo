export function newDispatcher() {

  // handlers is a map from event ID to set of functions.
  const handlers = new Map();

  // register associates a handler with an event ID. Whenever an event with the
  // given ID is dispatched, the given handler will be called.
  // register returns a function that unregisters the handler.
  function register(eventId, handler) {
    let h = handlers.get(eventId);
    if (h === undefined) {
      h = new Set();
      handlers.set(eventId, h);
    }
    h.add(handler);
    return () => {
      h.delete(handler);
      if (h.size === 0) {
        handlers.delete(eventId);
      }
    }
  }

  // dispatch calls all handlers associated with the given event's ID.
  function dispatch(e) {
    console.log(`dispatch ${e.id}`);
    const h = handlers.get(e.id)
    if (h !== undefined) {
      h.forEach((handler) => handler(e));
    }
  }

  return {
    register,
    dispatch
  };
}
