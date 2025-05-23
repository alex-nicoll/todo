package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
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
		log.Fatalf("Failed to decode signing key: %v", err)
	}

	dbURL, ok := os.LookupEnv("DB_URL")
	if !ok {
		log.Fatal("DB_URL not set")
	}
	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Failed to create database connection pool: %v\n", err)
	}
	defer pool.Close()

	http.Handle("/api", &apiHandler{
		pool:          pool,
		jwtSigningKey: jwtSigningKey,
		cookieName:    "accessToken",
	})
	log.Fatal(http.ListenAndServe(":8080", nil))
}

type apiHandler struct {
	pool          *pgxpool.Pool
	jwtSigningKey []byte
	cookieName    string
}

func (h *apiHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusBadRequest)
	}
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
	lor := &logoutRqst{}
	if err := json.Unmarshal(body, lor); err == nil && lor.Operation == "logout" {
		writeDeleteCookie(w, h.cookieName)
		return
	}
	gur := &getUsernameRqst{}
	if err := json.Unmarshal(body, gur); err == nil && gur.Operation == "getUsername" {
		h.serveGetUsername(w, r)
		return
	}
	cur := &createUserRqst{}
	if err := json.Unmarshal(body, cur); err == nil && cur.Operation == "createUser" {
		h.serveCreateUser(w, cur)
		return
	}
	gtr := &getTodosRqst{}
	if err := json.Unmarshal(body, gtr); err == nil && gtr.Operation == "getTodos" {
		withVerifyCookie(func(uid string) { h.serveGetTodos(w, uid) })(h, w, r)
		return
	}
	dtr := &deleteTodoRqst{}
	if err := json.Unmarshal(body, dtr); err == nil && dtr.Operation == "deleteTodo" {
		withVerifyCookie(func(uid string) { h.serveDeleteTodo(w, dtr, uid) })(h, w, r)
		return
	}
	utr := &updateTodoRqst{}
	if err := json.Unmarshal(body, utr); err == nil && utr.Operation == "updateTodo" {
		withVerifyCookie(func(uid string) { h.serveUpdateTodo(w, utr, uid) })(h, w, r)
		return
	}
	atr := &appendTodoRqst{}
	if err := json.Unmarshal(body, atr); err == nil && atr.Operation == "appendTodo" {
		withVerifyCookie(func(uid string) { h.serveAppendTodo(w, atr, uid) })(h, w, r)
		return
	}
	rtr := &refreshTodosRqst{}
	if err := json.Unmarshal(body, rtr); err == nil && rtr.Operation == "refreshTodos" {
		withVerifyCookie(func(uid string) { h.serveRefreshTodos(w, rtr, uid) })(h, w, r)
		return
	}
	log.Printf("received invalid or unrecognized JSON: %s", body)
	w.WriteHeader(http.StatusBadRequest)
}

// verifyCookie verifies the signature of the access token stored in the given
// request's cookie, and then retrieves the user ID from said access token.
// If an error occurs, verifyCookie logs the error, writes an appropriate
// response header, and returns "".
//
// If the cookie doesn't exist, then http.StatusBadRequest is sent, because the
// client might be trying to perform an operation that it is not authorized
// for; i.e., there may be a programming error on the client. Though there may
// be other causes of this scenario, we don't want to hide a potential
// programming error.
//
// verifyCookie calls getUidFromJwt internally. See that function's
// documentation for additional error scenarios.
func (h *apiHandler) verifyCookie(w http.ResponseWriter, r *http.Request) string {
	c, err := r.Cookie(h.cookieName)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusBadRequest)
		return ""
	}
	return h.getUIDFromJwt(w, c.Value)
}

// getUIDFromJwt verifies the JWT and extracts the user ID.
//
// If the JWT can't be verified, then the containing cookie is deleted and
// http.StatusInternalServerError is sent. Since the server is responsible for
// generating the JWT in the first place, a potential server programming error
// is indicated. There could be another cause (like a forgery attempt), but we
// shouldn't hide programming errors.
func (h *apiHandler) getUIDFromJwt(w http.ResponseWriter, tokenString string) string {
	token, err := jwt.Parse(
		tokenString,
		func(t *jwt.Token) (interface{}, error) {
			return h.jwtSigningKey, nil
		},
		jwt.WithValidMethods([]string{"HS256"}),
	)
	if err != nil {
		log.Println(err)
		writeDeleteCookie(w, h.cookieName)
		w.WriteHeader(http.StatusInternalServerError)
		return ""
	}
	claims := token.Claims.(jwt.MapClaims)
	return claims["uid"].(string)
}

// withVerifyCookie returns a new function that:
// 1. Calls verifyCookie, and then
// 2. If verifyCookie succeeds (returns a user ID), calls the given callback.
func withVerifyCookie(f func(string)) func(*apiHandler, http.ResponseWriter, *http.Request) {
	return func(h *apiHandler, w http.ResponseWriter, r *http.Request) {
		uid := h.verifyCookie(w, r)
		if uid != "" {
			f(uid)
		}
	}
}

// writeDeleteCookie writes a response header that instructs the client to
// delete the named cookie.
func writeDeleteCookie(w http.ResponseWriter, cookieName string) {
	http.SetCookie(w, &http.Cookie{
		Name:   cookieName,
		MaxAge: -1,
	})
}

func (h *apiHandler) serveLogin(w http.ResponseWriter, r *loginRqst) {
	uid, pwd, err := getUIDAndPassword(h.pool, r.Username)
	if err == pgx.ErrNoRows {
		writeJSON(w, &loginResp{DidLogin: false})
		return
	}
	if err != nil {
		log.Printf("Failed to get UID and password for name \"%v\": %v", r.Username, err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if r.Password != pwd {
		writeJSON(w, &loginResp{DidLogin: false})
		return
	}
	cookie := h.createCookie(uid)
	if cookie == nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	http.SetCookie(w, cookie)
	writeJSON(w, &loginResp{DidLogin: true})
}

// getUIDAndPassword gets the user ID and password for the given user name, or
// returns an error. It returns pgx.ErrNoRows if the user name doesn't exist.
func getUIDAndPassword(pool *pgxpool.Pool, name string) (uid string, pwd string, err error) {
	query := "SELECT id, password FROM users WHERE name = $1"
	row := pool.QueryRow(context.Background(), query, name)
	err = row.Scan(&uid, &pwd)
	return
}

func (h *apiHandler) createCookie(uid string) *http.Cookie {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"uid": uid})
	signedString, err := token.SignedString(h.jwtSigningKey)
	if err != nil {
		log.Printf("Failed to sign jwt: %v", err)
		return nil
	}
	return &http.Cookie{
		Name:     h.cookieName,
		Value:    signedString,
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	}
}

func (h *apiHandler) serveGetUsername(w http.ResponseWriter, r *http.Request) {
	c, err := r.Cookie(h.cookieName)
	if err != nil {
		// User is not logged in.
		writeJSON(w, &getUsernameResp{Username: ""})
		return
	}
	uid := h.getUIDFromJwt(w, c.Value)
	if uid == "" {
		return
	}
	username, err := getUsername(h.pool, uid)
	if err == pgx.ErrNoRows {
		log.Println("Warning: client is logged in as a non-existent user.")
		// This is not necessarily a client error. The user could have deleted
		// their account on a separate client.
		// Assume that this request is always sent when the page loads. Now is
		// a good time to log them out (i.e., after the app has stopped working
		// properly and they've refreshed the page). In the future, to avoid
		// this coupling, it might make more sense to check the user ID's
		// existence earlier on - maybe when serving the js file?
		writeDeleteCookie(w, h.cookieName)
		writeJSON(w, &getUsernameResp{Username: ""})
		return
	}
	if err != nil {
		log.Printf("Failed to get username for UID \"%v\": %v", uid, err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	writeJSON(w, &getUsernameResp{Username: username})
}

// getUsername gets the username for the given user ID, or returns an error. It
// returns pgx.ErrNoRows if the user ID doesn't exist.
func getUsername(pool *pgxpool.Pool, uid string) (name string, err error) {
	query := "SELECT name FROM users WHERE id = $1"
	row := pool.QueryRow(context.Background(), query, uid)
	err = row.Scan(&name)
	return
}

func (h *apiHandler) serveCreateUser(w http.ResponseWriter, r *createUserRqst) {
	resp, cookie := h.txCreateUser(r)
	if resp == nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if cookie != nil {
		http.SetCookie(w, cookie)
	}
	writeJSON(w, resp)
}

func (h *apiHandler) txCreateUser(r *createUserRqst) (resp *createUserResp, cookie *http.Cookie) {
	tx, err := h.pool.BeginTx(context.Background(), pgx.TxOptions{
		IsoLevel:       pgx.Serializable,
		AccessMode:     pgx.ReadWrite,
		DeferrableMode: pgx.NotDeferrable,
	})
	defer rollback(tx)
	if err != nil {
		log.Printf("Failed to start transaction: %v", err)
		return
	}
	exists, ok := checkUsername(tx, r.Username)
	if !ok {
		return
	}
	if exists {
		resp = &createUserResp{IsNameTaken: true}
		return
	}
	uid := createUser(tx, r.Username, r.Password)
	if uid == "" {
		return
	}
	c := h.createCookie(uid)
	if c == nil {
		return
	}
	err = tx.Commit(context.Background())
	if err != nil {
		log.Printf("Failed to commit transaction: %v", err)
		return
	}
	resp = &createUserResp{IsNameTaken: false}
	cookie = c
	return
}

// checkUsername checks whether the given username exists. If an error occurs,
// checkUsername logs the error and sets ok to false.
func checkUsername(tx pgx.Tx, name string) (exists bool, ok bool) {
	query := "SELECT FROM users WHERE name = $1"
	row := tx.QueryRow(context.Background(), query, name)
	err := row.Scan()
	if err == pgx.ErrNoRows {
		exists = false
		ok = true
		return
	}
	if err != nil {
		log.Printf("Failed to test existence of username \"%v\": %v",
			name, err)
		return
	}
	exists = true
	ok = true
	return
}

func createUser(tx pgx.Tx, name string, pwd string) (uid string) {
	uid = uuid.NewString()
	cmd := "INSERT INTO users (id, name, password, version) VALUES ($1, $2, $3, 0)"
	ct, err := tx.Exec(context.Background(), cmd, uid, name, pwd)
	if err != nil {
		log.Printf("Failed to create user with UID %v: %v", uid, err)
		uid = ""
		return
	}
	rowsAffected := ct.RowsAffected()
	if rowsAffected != 1 {
		log.Printf("Failed to create user with UID %v. Unexpected number "+
			"of rows affected (%v)", uid, rowsAffected)
		uid = ""
		return
	}
	return
}

func (h *apiHandler) serveGetTodos(w http.ResponseWriter, uid string) {
	resp := h.txGetTodos(uid)
	if resp == nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	writeJSON(w, resp)
}

func (h *apiHandler) txGetTodos(uid string) *getTodosResp {
	tx, err := h.pool.BeginTx(context.Background(), pgx.TxOptions{
		IsoLevel:       pgx.Serializable,
		AccessMode:     pgx.ReadOnly,
		DeferrableMode: pgx.NotDeferrable,
	})
	defer rollback(tx)
	if err != nil {
		log.Printf("Failed to start transaction: %v", err)
		return nil
	}
	version, ok := getVersion(tx, uid)
	if !ok {
		return nil
	}
	todos := getTodos(tx, uid)
	if todos == nil {
		return nil
	}
	err = tx.Commit(context.Background())
	if err != nil {
		log.Printf("Failed to commit transaction: %v", err)
		return nil
	}
	return &getTodosResp{
		Version: version,
		Todos:   todos,
	}
}

func (h *apiHandler) serveDeleteTodo(w http.ResponseWriter, r *deleteTodoRqst, uid string) {
	h.serveMutateTodo(w, r.Version, r.ID, uid, &deleteOperation{id: r.ID, uid: uid})
}

func (h *apiHandler) serveUpdateTodo(w http.ResponseWriter, r *updateTodoRqst, uid string) {
	h.serveMutateTodo(w, r.Version, r.ID, uid, &updateOperation{id: r.ID, uid: uid, value: r.Value})
}

func (h *apiHandler) serveMutateTodo(w http.ResponseWriter, version int32, id string, uid string, op execOperation) {
	resp := h.txMutateTodo(version, id, uid, op)
	if resp == "bad request" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if resp == nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	writeJSON(w, resp)
}

type execOperation interface {
	// run must call tx.Exec and return the result.
	run(tx pgx.Tx) (pgconn.CommandTag, error)
}

// txMutateTodo runs a transaction that mutates a particular todo. version and
// id are the todo list version and todo ID in the request that initiated the
// transaction. op is the operation (e.g. UPDATE, DELETE) to perform.
// txMutateTodo returns a response struct if the transaction was successful,
// "bad request" if the transaction failed due to a problem with the request, or
// nil if the transaction failed for some other reason.
func (h *apiHandler) txMutateTodo(version int32, id string, uid string, op execOperation) any {
	tx, err := h.pool.BeginTx(context.Background(), pgx.TxOptions{
		IsoLevel:       pgx.Serializable,
		AccessMode:     pgx.ReadWrite,
		DeferrableMode: pgx.NotDeferrable,
	})
	defer rollback(tx)
	if err != nil {
		log.Printf("Failed to start transaction: %v", err)
		return nil
	}
	resp, ok := checkVersion(tx, uid, version)
	if !ok {
		return nil
	}
	if resp != nil {
		return resp
	}
	mutateResult := mutateTodo(tx, op, id, uid)
	if mutateResult == "failed" {
		return nil
	}
	if mutateResult == "nonexistent" {
		return "bad request"
	}
	newVersion, ok := incrementVersion(tx, version, uid)
	if !ok {
		return nil
	}
	err = tx.Commit(context.Background())
	if err != nil {
		log.Printf("Failed to commit transaction: %v", err)
		return nil
	}
	return &mutateTodoResp{Version: newVersion}
}

// checkVersion checks for a mismatch between the given version and the stored
// version. If ok == false, then an error occurred. Otherwise, resp holds the
// response if a mismatch was detected, or nil if the versions match.
//
// If a mismatch is detected, checkVersion also attempts to commit tx.
func checkVersion(tx pgx.Tx, uid string, version int32) (resp *versionMismatchResp, ok bool) {
	storedVersion, ok := getVersion(tx, uid)
	if !ok {
		return nil, false
	}
	if version != storedVersion {
		log.Println("version mismatch")
		todos := getTodos(tx, uid)
		if todos == nil {
			return nil, false
		}
		if err := tx.Commit(context.Background()); err != nil {
			log.Printf("Failed to commit transaction: %v", err)
			return nil, false
		}
		return &versionMismatchResp{
			Version: storedVersion,
			Todos:   todos,
		}, true
	}
	return nil, true
}

func (h *apiHandler) serveAppendTodo(w http.ResponseWriter, r *appendTodoRqst, uid string) {
	resp := h.txAppendTodo(r, uid)
	if resp == "bad request" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if resp == nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	writeJSON(w, resp)
}

func (h *apiHandler) txAppendTodo(r *appendTodoRqst, uid string) any {
	// Note that we carry out the append operation even if the client's version
	// doesn't match. This is considered safe; there is no way for an append to
	// result in data loss, even if the client has a stale view.
	tx, err := h.pool.BeginTx(context.Background(), pgx.TxOptions{
		IsoLevel:       pgx.Serializable,
		AccessMode:     pgx.ReadWrite,
		DeferrableMode: pgx.NotDeferrable,
	})
	defer rollback(tx)
	if err != nil {
		log.Printf("Failed to start transaction: %v", err)
		return nil
	}
	appendResult := appendTodo(tx, r.ID, uid)
	if appendResult == "exists" {
		return "bad request"
	}
	if appendResult == "failure" {
		return nil
	}
	version, ok := getVersion(tx, uid)
	if !ok {
		return nil
	}
	newVersion, ok := incrementVersion(tx, version, uid)
	if !ok {
		return nil
	}
	if r.Version == version {
		err = tx.Commit(context.Background())
		if err != nil {
			log.Printf("Failed to commit transaction: %v", err)
			return nil
		}
		return &appendTodoResp{
			Version: newVersion,
		}
	}
	log.Println("version mismatch")
	todos := getTodos(tx, uid)
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

func (h *apiHandler) serveRefreshTodos(w http.ResponseWriter, r *refreshTodosRqst, uid string) {
	resp, ok := h.txRefreshTodos(r, uid)
	if !ok {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if resp == nil {
		return
	}
	writeJSON(w, resp)
}

func (h *apiHandler) txRefreshTodos(r *refreshTodosRqst, uid string) (resp *versionMismatchResp, ok bool) {
	tx, err := h.pool.BeginTx(context.Background(), pgx.TxOptions{
		IsoLevel:       pgx.Serializable,
		AccessMode:     pgx.ReadOnly,
		DeferrableMode: pgx.NotDeferrable,
	})
	defer rollback(tx)
	if err != nil {
		log.Printf("Failed to start transaction: %v", err)
		return nil, false
	}
	return checkVersion(tx, uid, r.Version)
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
// If the operation fails, mutateTodo logs the error.
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
			"not exist.", id, uid)
		return "nonexistent"
	}
	if rowsAffected != 1 {
		log.Printf("Failed to mutate todo with ID %v and UID %v. Unexpected number "+
			"of rows affected (%v)", id, uid, rowsAffected)
		return "failure"
	}
	return "success"
}

// appendTodo creates a new todo with the given ID and user ID.
// It returns "success" if the operation succeeded, "exists" if the todo already
// exists, or "failure" if the operation failed for some other reason.
// If the operation fails, appendTodo logs the error.
func appendTodo(tx pgx.Tx, id string, uid string) string {
	cmd := "INSERT INTO todos (id, user_id, value) VALUES ($1, $2, '')"
	ct, err := tx.Exec(context.Background(), cmd, id, uid)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			log.Printf("Failed to append todo with ID %v and UID %v. Todo already "+
				"exists.", id, uid)
			return "exists"
		}
		log.Printf("Failed to append todo for UID %v: %v", uid, err)
		return "failure"
	}
	rowsAffected := ct.RowsAffected()
	if rowsAffected != 1 {
		log.Printf("Failed to append todo for UID %v. Unexpected number "+
			"of rows affected (%v)", uid, rowsAffected)
		return "failure"
	}
	return "success"
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
	if err != nil {
		log.Printf("Failed to get todos for UID \"%v\": %v", uid, err)
		return nil
	}
	defer rows.Close()
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
// If an error occurs, getVersion logs the error.
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

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	enc := json.NewEncoder(w)
	err := enc.Encode(v)
	if err != nil {
		log.Println(err)
	}
}

// rollback attempts to rollback the given transaction, and logs any error that
// occurs. rollback is a no-op if the transaction is already committed/aborted.
func rollback(tx pgx.Tx) {
	err := tx.Rollback(context.Background())
	if err == nil || err == pgx.ErrTxClosed {
		return
	}
	log.Println(err)
}
