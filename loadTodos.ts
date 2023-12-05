import { ActionTag } from "./actions";
import { callApi } from "./api";
import { Dispatcher } from "./dispatcher";
import { newSyncStore } from "./syncStore";
import { newTodoStore, newTodosMap } from "./todoStore";

export async function loadTodos(apiUrl: string, dispatcher: Dispatcher) {
  const result = await callApi(apiUrl, "getTodos");
  if (result === "failed") {
    dispatcher.dispatch({ tag: ActionTag.GetTodosError });
    return;
  }
  const { version, todos } = result;
  const syncStore = newSyncStore();
  const todoStore = newTodoStore({
    apiUrl,
    dispatcher,
    syncStore,
    version,
    todos: newTodosMap(todos),
  });
  dispatcher.dispatch({
    tag: ActionTag.TodosLoaded,
    todoStore,
    syncStore,
  });
}
