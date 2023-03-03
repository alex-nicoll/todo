#!/bin/sh

npx esbuild main.jsx --bundle --minify --outfile=main.js
go run .
