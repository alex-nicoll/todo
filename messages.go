package main

// This file contains type definitions used to marshal/unmarshal data via the
// encoding/json package.
// Fields must be exported in order for encoding/json to access them.

type loginRqst struct {
	Operation string `json:"operation"`
	Username  string `json:"username"`
	Password  string `json:"password"`
}

type loginSuccessResp struct {
	Token string `json:"token"`
}

// Login failure is indicated by an empty object ({}).
type loginFailureResp struct{}

type getResp struct {
	Version int32       `json:"version"`
	Todos   [][2]string `json:"todos"`
}

type deleteRqst struct {
	Operation string `json:"operation"`
	Version   int32  `json:"version"`
	Id        string `json:"id"`
}

type updateRqst struct {
	Operation string `json:"operation"`
	Version   int32  `json:"version"`
	Id        string `json:"id"`
	Value     string `json:"value"`
}

type mutateResp struct {
	Version int32 `json:"version"`
}

// The client can differentiate between a successful mutate response and a
// version mismatch response by checking for the existence of "todos" in the
// response JSON.
type versionMismatchResp struct {
	Version int32       `json:"version"`
	Todos   [][2]string `json:"todos"`
}

type appendRqst struct {
	Operation string `json:"operation"`
	Version   int32  `json:"version"`
}

type appendResp struct {
	Version int32  `json:"version"`
	Id      string `json:"id"`
}
