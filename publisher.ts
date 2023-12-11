import React from "react";

export type Publisher = {
  /**
   * subscribe registers a callback to be invoked when new data is available.
   * subscribe returns a function that unregisters the callback.
   */
  subscribe: (callback: () => void) => void;
}

/**
 * useSubscribe causes the calling React component to re-render whenever the
 * given {@link Publisher} publishes.
 */
export function useSubscribe(publisher: Publisher) {
  const [, setState] = React.useState({});
  React.useEffect(
    () => publisher.subscribe(() => setState({})),
    []
  );
}
