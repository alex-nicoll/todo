package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"io"
	"log"
	"math"
	"net/http"
	"os"

	"github.com/golang-jwt/jwt/v4"
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

	jwtSigningKeyBase64, ok := os.LookupEnv("JWT_SIGNING_KEY")
	if !ok {
		log.Fatal("JWT_SIGNING_KEY not set")
	}
	jwtSigningKey, err := base64.StdEncoding.DecodeString(jwtSigningKeyBase64)
	if err != nil {
		log.Fatal("Failed to decode signing key: %v", err)
	}

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
	row := pool.QueryRow(context.Background(), "SELECT id FROM users WHERE name = 'default'")
	var defaultUid string
	err = row.Scan(&defaultUid)
	if err != nil {
		log.Fatal(err)
	}
	log.Println("default user ID:", defaultUid)

	http.Handle("/api", &apiHandler{
		pool:          pool,
		defaultUid:    defaultUid,
		jwtSigningKey: jwtSigningKey,
	})
	log.Fatal(http.ListenAndServe(":8080", nil))
}

type apiHandler struct {
	pool          *pgxpool.Pool
	defaultUid    string
	jwtSigningKey []byte
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
		lr := &loginRqst{}
		if err := json.Unmarshal(body, lr); err == nil && lr.Operation == "login" {
			h.serveLogin(w, lr)
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

func (h *apiHandler) serveLogin(w http.ResponseWriter, r *loginRqst) {
	uid, pwd, err := getUidAndPwd(h.pool, r.Username)
	if err == pgx.ErrNoRows {
		writeJson(w, &loginFailureResp{})
		return
	}
	if err != nil {
		log.Printf("Failed to get UID and password for name \"%v\": %v", r.Username, err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if r.Password != pwd {
		writeJson(w, &loginFailureResp{})
		return
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"uid": uid})
	signedString, err := token.SignedString(h.jwtSigningKey)
	if err != nil {
		log.Printf("Failed to sign jwt: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
	}
	writeJson(w, &loginSuccessResp{Token: signedString})
}

// getUidAndPwd gets the user ID and password for the given user name.
// It returns pgx.ErrNoRows if the user name doesn't exist.
func getUidAndPwd(pool *pgxpool.Pool, name string) (uid string, pwd string, err error) {
	query := "SELECT id, password FROM users WHERE name = $1"
	row := pool.QueryRow(context.Background(), query, name)
	err = row.Scan(&uid, &pwd)
	return
}

func (h *apiHandler) serveGet(w http.ResponseWriter) {
	resp := h.txGet()
	if resp == nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	writeJson(w, resp)
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

type execOperation interface {
	// run must call tx.Exec and return the result.
	run(tx pgx.Tx) (pgconn.CommandTag, error)
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

type deleteOperation struct {
	id  string
	uid string
}

func (d *deleteOperation) run(tx pgx.Tx) (pgconn.CommandTag, error) {
	return tx.Exec(context.Background(),
		"DELETE FROM todos WHERE id = $1 AND user_id = $2", d.id, d.uid)
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

// mutateTodo attempts to mutate a todo (e.g. DELETE, UPDATE) by running op.
// It returns "success" if the operation succeeded, "nonexistent" if the todo
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
// uid is the user ID.
// incrementVersion returns the new v and a boolean indicating whether the
// UPDATE command was successful. If the UPDATE fails, incrementVersion logs
// the error.
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

// getTodos gets the todos associated with the given user ID as a slice of
// pairs, where the first element of each pair is the ID and the second element
// is the value.
// If there are no such todos, getTodos returns an empty slice.
// If an error occurs, getTodos logs the error and returns nil.
func getTodos(tx pgx.Tx, uid string) [][2]string {
	query := "SELECT id, value FROM todos WHERE user_id = $1 ORDER BY created"
	rows, err := tx.Query(context.Background(), query, uid)
	defer rows.Close()
	if err != nil {
		log.Printf("Failed to get todos for UID \"%v\": %v", uid, err)
		return nil
	}
	var id, value string
	todos, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) ([2]string, error) {
		err := row.Scan(&id, &value)
		return [2]string{id, value}, err
	})
	if err != nil {
		log.Printf("Failed to iterate over query result while getting todos "+
			"for UID \"%v\": %v", uid, err)
		return nil
	}
	return todos
}

// getVersion gets the todo list version for the given user ID uid, returning
// the version and a boolean indicating whether the operation was successful.
func getVersion(tx pgx.Tx, uid string) (int32, bool) {
	row := tx.QueryRow(context.Background(), "SELECT version FROM users WHERE id = $1", uid)
	var v int32
	err := row.Scan(&v)
	if err != nil {
		log.Printf("Failed to get version for UID \"%v\": %v", uid, err)
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
