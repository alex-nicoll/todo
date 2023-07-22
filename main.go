package main

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"sync"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/exp/slices"
)

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./main.html")
	})
	http.HandleFunc("/main.js", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./main.js")
	})

	dbUrl, ok := os.LookupEnv("DB_URL")
	if !ok {
		log.Fatal("DB_URL not set")
	}
	pool, err := pgxpool.New(context.Background(), dbUrl)
	defer pool.Close()
	if err != nil {
		log.Fatalf("Failed to create database connection pool: %v\n", err)
	}

	// In the future, the user ID should be read from an authorization token
	// included in the client's request.
	defaultUid, ok := getValue[string](pool, "SELECT id FROM users WHERE name = 'default'")
	if !ok {
		os.Exit(1)
	}
	log.Println("default user ID:", defaultUid)

	http.Handle("/api", &apiHandler{
		version: 0,
		todos: [][2]string{
			[2]string{"a", "todo A"},
			[2]string{"b", "todo B"},
			[2]string{"c", "todo C"},
			[2]string{"d", "todo D"},
		},
		mu:         &sync.Mutex{},
		pool:       pool,
		defaultUid: defaultUid,
	})
	http.ListenAndServe(":8080", nil)
}

type apiHandler struct {
	version    uint32
	todos      [][2]string
	mu         *sync.Mutex
	pool       *pgxpool.Pool
	defaultUid string
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
		ur := &updateRqst{}
		if err := json.Unmarshal(body, ur); err == nil && ur.Operation == "update" {
			h.serveUpdate(w, ur)
			return
		}
		ar := &appendRqst{}
		if err := json.Unmarshal(body, ar); err == nil && ar.Operation == "append" {
			h.serveAppend(w, ar)
			return
		}
		log.Printf("received unrecognized JSON: %s", body)
		w.WriteHeader(http.StatusBadRequest)
	}
}

// Fields must be exported in order for encoding/json to access them.

type getResp struct {
	Version int32       `json:"version"`
	Todos   [][2]string `json:"todos"`
}

func (h *apiHandler) serveGet(w http.ResponseWriter) {
	resp := h.txGet()
	if resp == nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	writeJson(w, resp)
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
	if r.Version != h.version {
		log.Println("version mismatch")
		writeJson(w, &deleteMismatchResp{
			Version: h.version,
			Todos:   h.todos,
		})
		return
	}
	todoIndex := h.accessTodo(r.Key, w)
	if todoIndex != -1 {
		h.todos = slices.Delete(h.todos, todoIndex, todoIndex+1)
		incrementVersion(&(h.version))
		log.Println(h.version, h.todos)
		writeJson(w, &deleteResp{Version: h.version})
	}
}

type updateRqst struct {
	Operation string
	Version   uint32
	Key       string
	Value     string
}

type updateResp struct {
	Version uint32 `json:"version"`
}

type updateMismatchResp struct {
	Version uint32      `json:"version"`
	Todos   [][2]string `json:"todos"`
}

func (h *apiHandler) serveUpdate(w http.ResponseWriter, r *updateRqst) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if r.Version != h.version {
		log.Println("version mismatch")
		writeJson(w, &updateMismatchResp{
			Version: h.version,
			Todos:   h.todos,
		})
		return
	}
	todoIndex := h.accessTodo(r.Key, w)
	if todoIndex != -1 {
		h.todos[todoIndex][1] = r.Value
		incrementVersion(&(h.version))
		log.Println(h.version, h.todos)
		writeJson(w, &updateResp{Version: h.version})
	}
}

type appendRqst struct {
	Operation string `json:"operation"`
	Version   uint32 `json:"version"`
}

type appendResp struct {
	Version uint32 `json:"version"`
	Key     string `json:"key"`
}

type appendMismatchResp struct {
	Version uint32      `json:"version"`
	Todos   [][2]string `json:"todos"`
}

func (h *apiHandler) serveAppend(w http.ResponseWriter, r *appendRqst) {
	h.mu.Lock()
	defer h.mu.Unlock()
	key := uuid.NewString()
	h.todos = append(h.todos, [2]string{key, ""})
	v := h.version
	incrementVersion(&(h.version))
	if r.Version == v {
		writeJson(w, &appendResp{
			Version: h.version,
			Key:     key,
		})
		return
	}
	log.Println("version mismatch")
	writeJson(w, &appendMismatchResp{
		Version: h.version,
		Todos:   h.todos,
	})
}

// accessTodo finds the index of the todo with the given key.
// If the todo doesn't exist, accessTodo returns -1 and writes status code 400
// Bad Request to the ResponseWriter.
// Otherwise, it returns the todo index.
func (h *apiHandler) accessTodo(key string, w http.ResponseWriter) int {
	todoIndex := -1
	for i, todo := range h.todos {
		if todo[0] == key {
			todoIndex = i
			break
		}
	}
	if todoIndex == -1 {
		// Client has the correct version but the todo doesn't exist - a
		// potential client error.
		w.WriteHeader(http.StatusBadRequest)
	}
	return todoIndex
}

// TODO rewrite to work with int32
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

type queriable interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

func getTodos(q queriable, uid string) [][2]string {
	query := "SELECT id, value FROM todos WHERE user_id = $1"
	rows, err := q.Query(context.Background(), query, uid)
	defer rows.Close()
	if err != nil {
		log.Printf("Failed to execute query \"%v\": %v", query, err)
		return nil
	}
	todos := [][2]string{}
	for rows.Next() {
		var id string
		var value string
		if err := rows.Scan(&id, &value); err != nil {
			log.Printf("Failed to scan result of query \"%v\": %v", query, err)
			return nil
		}
		todos = append(todos, [2]string{id, value})
	}
	return todos
}

// getValue executes a PostgreSQL query where the result is a single row with a
// single column.
// The first return value is the single value extracted from the query result.
// It is the zero value of V if the query failed.
// The second return value is a boolean indicating whether the query succeeded.
// args are additional arguments to pass to q.Query.
func getValue[V any](q queriable, query string, args ...any) (V, bool) {
	rows, err := q.Query(context.Background(), query, args...)
	defer rows.Close()
	var value V
	if err != nil {
		log.Printf("Failed to execute query \"%v\": %v", query, err)
		return value, false
	}
	if hasNext := rows.Next(); !hasNext {
		log.Printf("No rows returned by query \"%v\"", query)
		return value, false
	}
	if err := rows.Scan(&value); err != nil {
		log.Printf("Failed to scan result of statement \"%v\": %v", query, err)
		return value, false
	}
	return value, true
}

func (h *apiHandler) txGet() *getResp {
	tx, err := h.pool.BeginTx(context.Background(), pgx.TxOptions{
		IsoLevel:       pgx.Serializable,
		AccessMode:     pgx.ReadOnly,
		DeferrableMode: pgx.NotDeferrable,
	})
	// Rollback is a no-op if the transaction is already committed/aborted.
	defer tx.Rollback(context.Background())
	if err != nil {
		log.Printf("Failed to start transaction: %v", err)
		return nil
	}
	version, ok := getValue[int32](tx, "SELECT version FROM users WHERE id = $1", h.defaultUid)
	if !ok {
		return nil
	}
	todos := getTodos(tx, h.defaultUid)
	if todos == nil {
		return nil
	}
	err = tx.Commit(context.Background())
	if err != nil {
		log.Printf("Failed to commit transaction: %v", err)
		return nil
	}
	return &getResp{
		Version: version,
		Todos:   todos,
	}
}
