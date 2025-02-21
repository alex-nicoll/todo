import { Actions, RawTodos, TodosSnapshot } from "./actions";
import { TaskQueue } from "./taskQueue";
import { createTodoStore } from "./todoStore";

export type TodoSynchronizerArgs = {
  version: number;
  initialTodos: RawTodos;
  actions: Actions;
  taskQueue: TaskQueue;
}

export type TodoSynchronizer = ReturnType<typeof createTodoSynchronizer>;

/**
 * createTodoSynchronizer produces an object that wraps todos and keeps them in
 * sync with the server.
 */
export function createTodoSynchronizer({
  version,
  initialTodos,
  actions,
  taskQueue
}: TodoSynchronizerArgs) {

  const todoStore = createTodoStore(initialTodos); 

  /**
   * todosUpdating is the set of todo IDs for which there are pending update
   * operations.
   */
  const todosUpdating = new Set<string>();

  /**
   * refresh ensures that the todos are up-to-date.
   */
  async function refresh() {
    taskQueue.addTask({
      run: () => actions.refreshTodos(createCommonArgs()),
      isSync: true
    });
  }

  async function remove(id: string) {
    todoStore.remove(id);
    taskQueue.addTask({
      run: () => actions.deleteTodo({ ...createCommonArgs(), id }),
      isSync: true
    });
  }

  async function appendNew() {
    const id = crypto.randomUUID();
    todoStore.appendNew(id);
    taskQueue.addTask({
      run: () => actions.appendNewTodo({ ...createCommonArgs(), id }),
      isSync: true
    });
  }

  /**
   * update waits 2 seconds before sending the current value to the server. This
   * reduces the number of requests sent when there are many updates in a short
   * period of time (e.g., when the user types).
   */
  async function update(id: string, value: string) {
    todoStore.update(id, value);
    if (todosUpdating.has(id)) {
      return;
    }
    todosUpdating.add(id);
    taskQueue.addTask({
      run: async () => {
        // Wait for 2 seconds.
        await new Promise((resolve) => setTimeout(resolve, 2000));
        todosUpdating.delete(id);
        if (!todoStore.has(id)) {
          // todo was deleted while we were waiting.
          return;
        }
        await actions.updateTodo({
          ...createCommonArgs(),
          id,
          value: todoStore.get(id)!
        });
      },
      isSync: true
    });
  }

  function createCommonArgs() {
    return {
      version,
      onTodosReceived: (r: TodosSnapshot) => {
        version = r.version;
        todoStore.replaceAll(r.todos);
      },
      onResultReceived: (r: { version: number }) => version = r.version
    };
  }

  return {
    subscribeToKeys: todoStore.subscribeToKeys,
    subscribeToValue: todoStore.subscribeToValue,
    get: todoStore.get,
    ids: todoStore.ids,
    refresh,
    remove,
    appendNew,
    update
  };
}