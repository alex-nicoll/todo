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
	Id        string `json:"id"`
}

type updateTodoRqst struct {
	Operation string `json:"operation"`
	Version   int32  `json:"version"`
	Id        string `json:"id"`
	Value     string `json:"value"`
}

// This is the response type for both delete and update requests.
type mutateTodoResp struct {
	Version int32 `json:"version"`
}

type appendTodoRqst struct {
	Operation string `json:"operation"`
	Version   int32  `json:"version"`
}

type appendTodoResp struct {
	Version int32  `json:"version"`
	Id      string `json:"id"`
}

// The client can differentiate between a normal mutate/append response and a
// version mismatch response by checking for the existence of "todos" in the
// response JSON.
type versionMismatchResp struct {
	Version int32       `json:"version"`
	Todos   [][2]string `json:"todos"`
}
