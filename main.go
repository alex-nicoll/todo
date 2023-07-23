package main

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"math"
	"net/http"
	"os"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
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
		pool:       pool,
		defaultUid: defaultUid,
	})
	http.ListenAndServe(":8080", nil)
}

type apiHandler struct {
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
	Version   int32
	Key       string
}

type mutateResp struct {
	Version int32 `json:"version"`
}

type versionMismatchResp struct {
	Version int32       `json:"version"`
	Todos   [][2]string `json:"todos"`
}

func (h *apiHandler) serveDelete(w http.ResponseWriter, r *deleteRqst) {
	resp := h.txMutate(r.Version, r.Key,
		&deleteOperation{id: r.Key, uid: h.defaultUid})
	if resp == "bad request" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if resp == nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	writeJson(w, resp)
}

type deleteOperation struct {
	id  string
	uid string
}

func (d *deleteOperation) run(tx pgx.Tx) (pgconn.CommandTag, error) {
	return tx.Exec(context.Background(),
		"DELETE FROM todos WHERE id = $1 AND user_id = $2", d.id, d.uid)
}

// txMutate runs a transaction that mutates a particular todo. rqstVersion and
// rqstId are the todo list version and todo ID in the request that initiated
// the transaction. op is the operation (e.g. UPDATE, DELETE) to perform.
// txMutate returns a response struct if the transaction was successful, "bad
// request" if the transaction failed due to a problem with the request, or nil
// if the transaction failed for some other reason.
func (h *apiHandler) txMutate(rqstVersion int32, rqstId string, op execOperation) any {
	tx, err := h.pool.BeginTx(context.Background(), pgx.TxOptions{
		IsoLevel:       pgx.Serializable,
		AccessMode:     pgx.ReadWrite,
		DeferrableMode: pgx.NotDeferrable,
	})
	// Rollback is a no-op if the transaction is already committed/aborted.
	defer tx.Rollback(context.Background())
	if err != nil {
		log.Printf("Failed to start transaction: %v", err)
		return nil
	}
	version, ok := getVersion(tx, h.defaultUid)
	if !ok {
		return nil
	}
	if rqstVersion != version {
		log.Println("version mismatch")
		todos := getTodos(tx, h.defaultUid)
		if todos == nil {
			return nil
		}
		err = tx.Commit(context.Background())
		if err != nil {
			log.Printf("Failed to commit transaction: %v", err)
			return nil
		}
		return &versionMismatchResp{
			Version: version,
			Todos:   todos,
		}
	}
	mutateResult := mutateTodo(tx, op, rqstId, h.defaultUid)
	if mutateResult == "failed" {
		return nil
	}
	if mutateResult == "nonexistent" {
		return "bad request"
	}
	newVersion, ok := incrementVersion(tx, version, h.defaultUid)
	if !ok {
		return nil
	}
	err = tx.Commit(context.Background())
	if err != nil {
		log.Printf("Failed to commit transaction: %v", err)
		return nil
	}
	return &mutateResp{Version: newVersion}
}

type execOperation interface {
	// run must call tx.Exec and return the result.
	run(tx pgx.Tx) (pgconn.CommandTag, error)
}

// mutateTodo attempts to mutate a todo (e.g. DELETE, UPDATE) by running op.
// It returns "success" if the delete was successful, "nonexistent" if the todo
// doesn't exist, or "failure" if the operation failed for some other reason.
func mutateTodo(tx pgx.Tx, op execOperation, id string, uid string) string {
	ct, err := op.run(tx)
	if err != nil {
		log.Printf("Failed to mutate todo with ID %v and UID %v: %v",
			id, uid, err)
		return "failure"
	}
	rowsAffected := ct.RowsAffected()
	if rowsAffected == 0 {
		log.Printf("Failed to mutate todo with ID %v and UID %v. todo does "+
			"not exist.", id, uid, rowsAffected)
		return "nonexistent"
	}
	if rowsAffected != 1 {
		log.Printf("Failed to mutate todo with ID %v and UID %v. Unexpected number "+
			"of rows affected (%v)", id, uid, rowsAffected)
		return "failure"
	}
	return "success"
}

type updateRqst struct {
	Operation string
	Version   int32
	Key       string
	Value     string
}

func (h *apiHandler) serveUpdate(w http.ResponseWriter, r *updateRqst) {
	resp := h.txMutate(r.Version, r.Key,
		&updateOperation{id: r.Key, uid: h.defaultUid, value: r.Value})
	if resp == "bad request" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if resp == nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	writeJson(w, resp)
}

type updateOperation struct {
	id    string
	uid   string
	value string
}

func (u *updateOperation) run(tx pgx.Tx) (pgconn.CommandTag, error) {
	return tx.Exec(context.Background(),
		"UPDATE todos SET value = $1 WHERE id = $2 AND user_id = $3",
		u.value, u.id, u.uid)
}

type appendRqst struct {
	Operation string `json:"operation"`
	Version   int32  `json:"version"`
}

type appendResp struct {
	Version int32  `json:"version"`
	Key     string `json:"key"`
}

func (h *apiHandler) serveAppend(w http.ResponseWriter, r *appendRqst) {
	resp := h.txAppend(r)
	if resp == nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	writeJson(w, resp)
}

func (h *apiHandler) txAppend(r *appendRqst) any {
	// Note that we carry out the append operation even if the client's version
	// doesn't match. This is considered safe; there is no way for an append to
	// result in data loss, even if the client has a stale view.
	tx, err := h.pool.BeginTx(context.Background(), pgx.TxOptions{
		IsoLevel:       pgx.Serializable,
		AccessMode:     pgx.ReadWrite,
		DeferrableMode: pgx.NotDeferrable,
	})
	// Rollback is a no-op if the transaction is already committed/aborted.
	defer tx.Rollback(context.Background())
	if err != nil {
		log.Printf("Failed to start transaction: %v", err)
		return nil
	}
	key := appendTodo(tx, h.defaultUid)
	if key == "" {
		return nil
	}
	version, ok := getVersion(tx, h.defaultUid)
	if !ok {
		return nil
	}
	newVersion, ok := incrementVersion(tx, version, h.defaultUid)
	if !ok {
		return nil
	}
	if r.Version == version {
		err = tx.Commit(context.Background())
		if err != nil {
			log.Printf("Failed to commit transaction: %v", err)
			return nil
		}
		return &appendResp{
			Version: newVersion,
			Key:     key,
		}
	}
	log.Println("version mismatch")
	todos := getTodos(tx, h.defaultUid)
	if todos == nil {
		return nil
	}
	err = tx.Commit(context.Background())
	if err != nil {
		log.Printf("Failed to commit transaction: %v", err)
		return nil
	}
	return &versionMismatchResp{
		Version: newVersion,
		Todos:   todos,
	}
}

func appendTodo(tx pgx.Tx, uid string) string {
	key := uuid.NewString()
	cmd := "INSERT INTO todos (id, user_id, value) VALUES ($1, $2, '')"
	ct, err := tx.Exec(context.Background(), cmd, key, uid)
	if err != nil {
		log.Printf("Failed to append todo for UID %v: %v", uid, err)
		return ""
	}
	rowsAffected := ct.RowsAffected()
	if rowsAffected != 1 {
		log.Printf("Failed to append todo for UID %v. Unexpected number "+
			"of rows affected (%v)", uid, rowsAffected)
		return ""
	}
	return key
}

// incrementVersion increments the todo list version for the user with the
// given user ID.
// tx is the transaction in which to perform the associated UPDATE.
// v is the current todo list version.
// uid is the user ID
// incrementVersion returns the new v and a boolean indicating whether the
// UPDATE command was successful.
func incrementVersion(tx pgx.Tx, v int32, uid string) (int32, bool) {
	if v == math.MaxInt32 {
		v = 0
	} else {
		v++
	}
	ct, err := tx.Exec(context.Background(),
		"UPDATE users SET version = $1 WHERE id = $2", v, uid)
	if err != nil {
		log.Printf("Failed to increment version for UID %v: %v", uid, err)
		return v, false
	}
	rowsAffected := ct.RowsAffected()
	if rowsAffected != 1 {
		log.Printf("Failed to increment version for UID %v. Unexpected number "+
			"of rows affected (%v)", uid, rowsAffected)
		return v, false
	}
	return v, true
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
	query := "SELECT id, value FROM todos WHERE user_id = $1 ORDER BY created"
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
	version, ok := getVersion(tx, h.defaultUid)
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

func getVersion(q queriable, uid string) (int32, bool) {
	return getValue[int32](q, "SELECT version FROM users WHERE id = $1", uid)
}
