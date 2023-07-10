package main

import (
	"encoding/json"
	"io"
	"log"
	"math"
	"net/http"
	"sync"

	"golang.org/x/exp/slices"
)

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./main.html")
	})
	http.HandleFunc("/main.js", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./main.js")
	})
	http.Handle("/api", &apiHandler{
		version: 0,
		todos: [][2]string{
			[2]string{"a", "todo A"},
			[2]string{"b", "todo B"},
			[2]string{"c", "todo C"},
			[2]string{"d", "todo D"},
		},
		mu: &sync.Mutex{},
	})
	http.ListenAndServe(":8080", nil)
}

type apiHandler struct {
	version uint32
	todos   [][2]string
	mu      *sync.Mutex
}

func (h *apiHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		h.serveGet(w)
	}
	if r.Method == http.MethodPost {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			log.Println(err)
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		dr := &deleteRqst{}
		if err := json.Unmarshal(body, dr); err == nil && dr.Operation == "delete" {
			h.serveDelete(w, dr)
			return
		}
		log.Printf("received unrecognized JSON: %s", body)
		w.WriteHeader(http.StatusBadRequest)
		return
	}
}

// Fields must be exported in order for encoding/json to access them.

type getResp struct {
	Version uint32      `json:"version"`
	Todos   [][2]string `json:"todos"`
}

func (h *apiHandler) serveGet(w http.ResponseWriter) {
	h.mu.Lock()
	writeJson(w, &getResp{
		Version: h.version,
		Todos:   h.todos,
	})
	h.mu.Unlock()
	return
}

type deleteRqst struct {
	Operation string
	Version   uint32
	Key       string
}

type deleteResp struct {
	Version uint32 `json:"version"`
}

type deleteMismatchResp struct {
	Version uint32      `json:"version"`
	Todos   [][2]string `json:"todos"`
}

func (h *apiHandler) serveDelete(w http.ResponseWriter, r *deleteRqst) {
	h.mu.Lock()
	defer h.mu.Unlock()
	todoIndex := -1
	for i, todo := range h.todos {
		if todo[0] == r.Key {
			todoIndex = i
			break
		}
	}
	if r.Version == h.version {
		if todoIndex == -1 {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		h.deleteTodo(todoIndex)
		writeJson(w, &deleteResp{Version: h.version})
		return
	}
	// version mismatch
	log.Println("version mismatch")
	if todoIndex != -1 {
		h.deleteTodo(todoIndex)
	}
	writeJson(w, &deleteMismatchResp{
		Version: h.version,
		Todos:   h.todos,
	})
	return
}

func (h *apiHandler) deleteTodo(todoIndex int) {
	h.todos = slices.Delete(h.todos, todoIndex, todoIndex+1)
	incrementVersion(&(h.version))
	log.Println(h.version, h.todos)
}

func incrementVersion(v *uint32) {
	if *v == math.MaxUint32 {
		*v = 0
	} else {
		*v++
	}
}

func writeJson(w http.ResponseWriter, v any) {
	enc := json.NewEncoder(w)
	err := enc.Encode(v)
	if err != nil {
		log.Println(err)
	}
}
