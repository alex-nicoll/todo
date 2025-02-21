export type CheckLoginStatusArgs = {
  onLoggedIn: (username: string) => void;
  onLoggedOut: () => void;
};

export type LoginArgs = {
  username: string;
  password: string;
  onLoggedIn: () => void;
  onCredentialsRejected: () => void;
};

export type LogoutArgs = {
  onLoggedOut: () => void;
};

export type CreateUserArgs = {
  username: string;
  password: string;
  onLoggedIn: () => void;
  onUsernameTaken: () => void;
};

export type RawTodos = [string, string][];

export type TodosSnapshot = {
  version: number;
  todos: RawTodos;
};

export type GetTodosArgs = {
  onTodosReceived: (result: TodosSnapshot) => void;
};

export type RefreshTodosArgs = {
  version: number;
  onTodosReceived: (result: TodosSnapshot) => void;
};

export type DeleteTodoArgs = {
  version: number;
  id: string;
  onTodosReceived: (result: TodosSnapshot) => void;
  onResultReceived: (result: { version: number }) => void
};

export type AppendNewTodoArgs = {
  version: number;
  id: string;
  onTodosReceived: (result: TodosSnapshot) => void;
  onResultReceived: (result: { version: number }) => void
};

export type UpdateTodoArgs = {
  version: number;
  id: string;
  value: string;
  onTodosReceived: (result: TodosSnapshot) => void;
  onResultReceived: (result: { version: number }) => void
};

// todo: consider reducing duplication in the type defs above

export type Actions = ReturnType<typeof createActions>;

/**
 * createActions returns a bunch of async helper functions for interacting with
 * the API. They call the API and process the result asynchronously. Callers can
 * pass in callbacks to handle different results. Callers can also await the
 * returned Promise<void>, which is guaranteed to resolve *after* the proper
 * callback is invoked.
 * 
 * createActions takes the API URL as an argument so you don't have to pass it
 * to every function. The returned object doesn't (and shouldn't) have any
 * internal state.
 */
export function createActions(apiUrl: string) {

  async function checkLoginStatus(args: CheckLoginStatusArgs) {
    const resp = await callApi({ operation: "getUsername" });
    const { username } = await parseJson(resp);
    if (username === "") {
      args.onLoggedOut();
      return;
    }
    args.onLoggedIn(username);
  }

  async function login(args: LoginArgs) {
    const { username, password } = args;
    const resp = await callApi({ operation: "login", username, password });
    const { didLogin } = await parseJson(resp);
    if (didLogin === false) {
      args.onCredentialsRejected();
      return;
    }
    args.onLoggedIn();
  }

  // todo: this is a little weird. Couldn't the caller just await or .then() ?
  async function logout(args: LogoutArgs) {
    await callApi({ operation: "logout" });
    args.onLoggedOut();
  }

  async function register(args: CreateUserArgs) {
    const { username, password } = args;
    const resp = await callApi({ operation: "createUser", username, password });
    const { isNameTaken } = await parseJson(resp);
    if (isNameTaken) {
      args.onUsernameTaken();
      return;
    }
    args.onLoggedIn();
  }

  async function getTodos(args: GetTodosArgs) {
    const resp = await callApi({ operation: "getTodos" });
    const result = await parseJson(resp);
    // todo: result has type "any". Should we check that result is in the format
    // that we expect?
    args.onTodosReceived(result);
  }

  async function refreshTodos(args: RefreshTodosArgs) {
    const resp = await callApi(
      { operation: "refreshTodos", version: args.version },
    );
    if (!containsJson(resp)) {
      console.log("refreshTodos: Already up-to-date.");
      return;
    }
    const result = await parseJson(resp);
    args.onTodosReceived(result);
  }

  async function deleteTodo(args: DeleteTodoArgs) {
    const resp = await callApi(
      { operation: "deleteTodo", version: args.version, id: args.id }
    );
    const result = await parseJson(resp);
    if (result.todos !== undefined) {
      args.onTodosReceived(result);
    }
    args.onResultReceived(result);
  }

  async function appendNewTodo(args: AppendNewTodoArgs) {
    const resp = await callApi(
      { operation: "appendTodo", version: args.version, id: args.id }
    );
    const result = await parseJson(resp);
    if (result.todos !== undefined) {
      args.onTodosReceived(result);
    }
    args.onResultReceived(result);
  }

  async function updateTodo(args: UpdateTodoArgs) {
    const resp = await callApi({
      operation: "updateTodo",
      version: args.version,
      id: args.id,
      value: args.value
    });
    const result = await parseJson(resp);
    if (result.todos !== undefined) {
      args.onTodosReceived(result);
    }
    args.onResultReceived(result);
  }

  /**
   * callApi initiates a POST request to apiUrl and returns the {@link Response}.
   * The request body is the JSON encoding of msg.
   * callApi throws an {@link Error} if the response status code is not 200.
   */
  async function callApi(msg: object) {
    const options = {
      method: "POST",
      body: JSON.stringify(msg),
    };
    console.log(options);
    const resp = await fetch(apiUrl, options);
    if (resp.status !== 200) {
      throw new Error(`Received a non-200 status code: ${resp.status}`);
    }
    return resp;
  }

  return {
    checkLoginStatus,
    login,
    logout,
    register,
    getTodos,
    refreshTodos,
    deleteTodo,
    appendNewTodo,
    updateTodo
  };
}

/**
 * parseJson parses a {@link Response} body as JSON, logging the result before
 * returning it.
 * 
 * An error is thrown if there is no JSON to parse. To determine whether the
 * response contains JSON before parsing it, call {@link containsJson}.
 */
async function parseJson(resp: Response) {
  const v = await resp.json();
  console.log(v);
  return v;
}

/**
 * containsJson checks whether the given {@link Response} contains JSON. 
 */
function containsJson(resp: Response) {
  const contentType = resp.headers.get("content-type");
  return contentType !== null && contentType.indexOf("application/json") !== -1;
}