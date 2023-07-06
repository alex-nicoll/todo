package main

import "net/http"

func main() {
	getResponseBody := "{\"version\":\"0\",\"todos\":[[\"a\",\"todo A\"],[\"b\",\"todo B\"]]}"

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./main.html")
	})
	http.HandleFunc("/main.js", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./main.js")
	})
	http.HandleFunc("/api", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" {
			w.Write([]byte(getResponseBody))
		}
	})
	http.ListenAndServe(":8080", nil)
}
