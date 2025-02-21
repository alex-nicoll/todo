export type Task = {
  /**
   * isSync indicates whether the task is involved in syncing todos with the server.
   */
  isSync: boolean;
  run: () => Promise<void>;
}

export type TaskQueueArgs = {
  onSyncStarted: () => void;
  onSyncDone: () => void;
  onTaskError: () => void;
}

export type TaskQueue = ReturnType<typeof createTaskQueue>;

/**
 * createTaskQueue creates a queue of asynchronous functions or "tasks". When a
 * task is added, if there were no tasks in the queue, the task executes. When a
 * task finishes, it is removed from the queue and the next task executes. If a
 * task throws an error, the error handler is called and tasks stop executing.
 * If a task is added after the queue has stopped, an error is thrown.
 */
export function createTaskQueue({
  onSyncStarted,
  onSyncDone,
  onTaskError
}: TaskQueueArgs) {
  const tasks: Task[] = [];
  let isStopped = false;

  function addTask({ isSync, run }: Task) {
    if (isStopped) {
      throw new Error("Can't add a task to a stopped queue.");
    }
    const wrappedRun = async () => {
      try {
        await run();
      } catch (e) {
        isStopped = true;
        onTaskError();
      }
      // Remove the current task and start the next one (tasks remain in the
      // queue until they complete).
      const task = tasks.pop();
      if (task!.isSync && tasks.findIndex((t) => t.isSync) === -1) {
        onSyncDone();
      }
      if (tasks.length !== 0) {
        tasks[tasks.length-1].run();
      }
    }

    // Add the task to the start of the queue.
    tasks.unshift({ isSync, run: wrappedRun });
    if (tasks.filter((t) => t.isSync).length === 1) {
      onSyncStarted();
    }
    if (tasks.length === 1) {
      // The queue was empty. Run the task that we just added.
      wrappedRun();
    }
  }

  return { addTask };
}
