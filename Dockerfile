FROM node:21.2.0-alpine3.17 AS js-base
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm clean-install
COPY *.js *.jsx ./

FROM js-base AS js-lint
COPY .eslintrc.json ./
RUN npx eslint ./

FROM js-base AS js-build
RUN npx esbuild main.jsx --bundle --minify --outfile=/out/main.js

FROM golang:1.20.11-bullseye AS go-base
# Disable CGO to produce statically linked executables.
ENV CGO_ENABLED=0
WORKDIR /src
COPY go.* *.go ./

FROM go-base AS go-lint
COPY --from=golangci/golangci-lint:v1.55.2-alpine \
/usr/bin/golangci-lint /usr/bin/golangci-lint
# The --mount arguments to RUN cause the Go module cache, Go build cache, and
# golangci-lint cache to be persisted and reused across Docker builds.
RUN \
--mount=type=cache,target=/go/pkg/mod \
--mount=type=cache,target=/root/.cache/go-build \
--mount=type=cache,target=/root/.cache/golangci-lint \
#golangci-lint run -E gofmt,revive --exclude-use-default=false
golangci-lint run -E gofmt,revive

FROM go-base AS go-build
RUN \
--mount=type=cache,target=/go/pkg/mod \
--mount=type=cache,target=/root/.cache/go-build \
go build -o /out/server .

FROM scratch AS bin
WORKDIR /app
COPY main.html ./
COPY --from=js-build /out/main.js ./
COPY --from=go-build /out/server ./
ENTRYPOINT ["/app/server"]
