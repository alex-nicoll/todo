import { useContext, useEffect, useState } from "react";
import { ActionsContext } from "./actionsContext";
import { LoadingAnimation } from "./loadingAnimation";
import { TodoEditor } from "./todoEditor";
import { createTodoSynchronizer } from "./todoSynchronizer";
import { TaskQueue } from "./taskQueue";

export type TodosProps = {
  taskQueue: TaskQueue;
};

export function Todos({ taskQueue }: TodosProps) {
  const [state, setState] = useState(<LoadingAnimation />);

  const actions = useContext(ActionsContext);
  
  useEffect(() => {
    taskQueue.addTask({
      run: () => actions.getTodos({
        onTodosReceived: ({ version, todos }) => {
          const ts = createTodoSynchronizer({
            version,
            initialTodos: todos,
            actions,
            taskQueue
          })
          setState(<TodoEditor ts={ts} />);
        }
      }),
      isSync: false
    });
  }, [actions, taskQueue])

  return state;
}