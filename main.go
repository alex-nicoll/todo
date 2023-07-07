package main

import (
	"encoding/json"
	"log"
	"math"
	"net/http"
	"sync"

	"golang.org/x/exp/slices"
)

// Fields must be exported in order for encoding/json to access them.

type todos struct {
	Version uint32      `json:"version"`
	Todos   [][2]string `json:"todos"`
}

type deleteRqst struct {
	Operation string // must be "delete"
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

func main() {
	t := &todos{
		Version: 0,
		Todos: [][2]string{
			[2]string{"a", "todo A"},
			[2]string{"b", "todo B"},
			[2]string{"c", "todo C"},
			[2]string{"d", "todo D"},
		},
	}
	mu := &sync.Mutex{}
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./main.html")
	})
	http.HandleFunc("/main.js", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./main.js")
	})
	http.HandleFunc("/api", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			mu.Lock()
			writeJson(w, t)
			mu.Unlock()
			return
		}
		if r.Method == http.MethodPost {
			dec := json.NewDecoder(r.Body)
			dec.DisallowUnknownFields()
			rqst := &deleteRqst{}
			err := dec.Decode(rqst)
			if err == nil {
				if rqst.Operation != "delete" {
					w.WriteHeader(http.StatusBadRequest)
					return
				}
				mu.Lock()
				defer mu.Unlock()
				todoIndex := -1
				for i, todo := range t.Todos {
					if todo[0] == rqst.Key {
						todoIndex = i
						break
					}
				}
				if rqst.Version == t.Version {
					if todoIndex == -1 {
						w.WriteHeader(http.StatusBadRequest)
						return
					}
					deleteTodo(t, todoIndex)
					writeJson(w, &deleteResp{Version: t.Version})
					return
				}
				// version mismatch
				log.Println("version mismatch")
				if todoIndex != -1 {
					deleteTodo(t, todoIndex)
				}
				writeJson(w, &deleteMismatchResp{
					Version: t.Version,
					Todos:   t.Todos,
				})
				return
			}
			log.Println(err)
			w.WriteHeader(http.StatusBadRequest)
			return
		}
	})
	http.ListenAndServe(":8080", nil)
}

func deleteTodo(t *todos, todoIndex int) {
	t.Todos = slices.Delete(t.Todos, todoIndex, todoIndex+1)
	incrementVersion(&(t.Version))
	log.Println(t)
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
