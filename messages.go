package main

// Fields must be exported in order for encoding/json to access them.

type getResp struct {
	Version int32       `json:"version"`
	Todos   [][2]string `json:"todos"`
}

type deleteRqst struct {
	Operation string `json:"operation"`
	Version   int32  `json:"version"`
	Key       string `json:"key"`
}

type updateRqst struct {
	Operation string `json:"operation"`
	Version   int32  `json:"version"`
	Key       string `json:"key"`
	Value     string `json:"value"`
}

type mutateResp struct {
	Version int32 `json:"version"`
}

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
	Key     string `json:"key"`
}
