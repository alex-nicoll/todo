import { RawTodos } from "./actions";
import { noop } from "./noop";

export type TodoStore = ReturnType<typeof createTodoStore>;

// todo: Can we use MobX or something similar to remove this boilerplate?

/**
 * createTodoStore takes {@link RawTodos} and produces a key-value store that
 * can be efficiently modified and subscribed to.
 */
export function createTodoStore(todos: RawTodos) {

  let todoMap = createTodoMap(todos);

  let keySubscriber = noop;

  const valueSubscriberMap = new Map<string, () => void>();

  /**
   * subscribeToKeys registers a callback to be invoked whenever the todo IDs
   * (keys of the map returned by {@link getTodos}) change, but not when the
   * todo values change. At most one callback may be registered.
   *
   * subscribeToKeys returns a function that unregisters the callback.
   */
  function subscribeToKeys(callback: () => void) {
    keySubscriber = callback;
    return () => {
      keySubscriber = noop;
    };
  }

  /**
   * subscribeToValue registers a callback to be invoked whenever the value
   * associated with the given todo ID changes. At most one callback may be
   * registered per todo ID.
   *
   * subscribeToValue returns a function that unregisters the callback.
   */
  function subscribeToValue(id: string, callback: () => void) {
    valueSubscriberMap.set(id, callback);
    return () => {
      valueSubscriberMap.delete(id);
    };
  }

  function get(id: string) {
    return todoMap.get(id);
  }
  
  function ids() {
    return todoMap.keys();
  }

  function has(id: string) {
    return todoMap.has(id);
  }

  function update(id: string, value: string) {
    if (!todoMap.has(id)) {
      throw new Error(`Failed to update todo with ID=${id}.\nThe todo does not exist.`)
    }
    todoMap.set(id, value);
    valueSubscriberMap.get(id)?.();
  }

  function appendNew(id: string) {
    if (todoMap.has(id)) {
      throw new Error(`Failed to append new todo with ID=${id}.\nThe todo already exists.`)
    }
    todoMap.set(id, "");
    keySubscriber();
  }

  function remove(id: string) {
    if (!todoMap.delete(id)) {
      throw new Error(`Failed to delete todo with ID=${id}.\nThe todo does not exist.`)
    }
    keySubscriber();
  }

  function replaceAll(todos: RawTodos) {
    todoMap = createTodoMap(todos);
    keySubscriber();
  }

  return {
    subscribeToKeys,
    subscribeToValue,
    get,
    ids,
    has,
    update,
    appendNew,
    remove,
    replaceAll
  }
}

export function createTodoMap(todos: RawTodos) {
  const todosMap = new Map<string, string>();
  for (const [id, value] of todos) {
    todosMap.set(id, value)
  }
  return todosMap;
}
