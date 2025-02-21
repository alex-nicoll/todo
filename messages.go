package main

// This file contains type definitions used to marshal/unmarshal data via the
// encoding/json package.
// Fields must be exported in order for encoding/json to access them.

type loginRqst struct {
	Operation string `json:"operation"`
	Username  string `json:"username"`
	Password  string `json:"password"`
}

type loginResp struct {
	// true if login succeeded
	// false if credentials invalid
	DidLogin bool `json:"didLogin"`
}

// Logout requests do not return any JSON.
type logoutRqst struct {
	Operation string `json:"operation"`
}

type getUsernameRqst struct {
	Operation string `json:"operation"`
}

type getUsernameResp struct {
	Username string `json:"username"`
}

type createUserRqst struct {
	Operation string `json:"operation"`
	Username  string `json:"username"`
	Password  string `json:"password"`
}

type createUserResp struct {
	// true if the username already exists
	// false if the user was created and the client is now logged in
	IsNameTaken bool `json:"isNameTaken"`
}

type getTodosRqst struct {
	Operation string `json:"operation"`
}

type getTodosResp struct {
	Version int32       `json:"version"`
	Todos   [][2]string `json:"todos"`
}

type deleteTodoRqst struct {
	Operation string `json:"operation"`
	Version   int32  `json:"version"`
	ID        string `json:"id"`
}

type updateTodoRqst struct {
	Operation string `json:"operation"`
	Version   int32  `json:"version"`
	ID        string `json:"id"`
	Value     string `json:"value"`
}

// This is the response type for both delete and update requests.
type mutateTodoResp struct {
	Version int32 `json:"version"`
}

type appendTodoRqst struct {
	Operation string `json:"operation"`
	Version   int32  `json:"version"`
	ID        string `json:"id"`
}

type appendTodoResp struct {
	Version int32 `json:"version"`
}

// Refresh requests do not return any JSON if the client's todos are up-to-date.
type refreshTodosRqst struct {
	Operation string `json:"operation"`
	Version   int32  `json:"version"`
}

// This is an alternate response for delete, update, append, and refresh
// requests.
type versionMismatchResp struct {
	Version int32       `json:"version"`
	Todos   [][2]string `json:"todos"`
}
