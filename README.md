# todo

todo is a to-do list web application. It supports creating, deleting, and updating elements of a large list, as well as creating and signing in and out of user accounts. 

[See it live](https://2axmudecks.us-east-1.awsapprunner.com/)

An initial goal of this exercise was to practice building web applications with scalablity and high availability in mind, while getting more experience with React, Go, and PostgreSQL.

An interesting feature of this application is that it uses a "version-checking" approach to detecting concurrency, which keeps the web server stateless. Each list has a version associated with it, which is replicated to each client. When a client attempts to replicate a change to the server, the server checks the version sent along with the change, and if it doesn't match, rejects the change and sends the client a new list snapshot and version. From the user's perspective, when they make a change or open the tab/window, the application says that it is "syncing", after which they see any changes that they made from other web browsers. For simplicity's sake, there is no merging of replicas; the change that triggered the "sync" may be lost.

## Installation

### Database

1. Set up a PostgreSQL instance. This could be done [with Docker](https://hub.docker.com/_/postgres/), or with some cloud-based offering. The live version above uses [AWS RDS](https://aws.amazon.com/rds/postgresql/).
2. Intialize the database by running the `reset` script through `psql`. For example:
```
cd todo
psql -h <host> -p 5432 -U postgres -f reset
```

### Application

The application is available as a Docker image for linux/amd64 at the following URI:
```
public.ecr.aws/c6p3f3e9/todo:latest
```

The image depends on two environment variables:
- `JWT_SIGNING_KEY`. This should be a 256-bit, base64-encoded string that is kept secret. It is used to authenticate logged in users. The same key should be used on all application instances. If the key changes, users will encounter errors and find themselves logged out. A key can be generated with OpenSSL:
```
openssl rand -base64 32
```
- `DB_URL`. This is the full URL used to connect to the PostreSQL instance, including username and password. E.g.
```
postgres://postgres:<password>@<host>:5432/postgres 
```

You can use Docker to pull the image and run a single instance, using the `-e` flag to pass in the required environment variables. E.g.
```
docker run -it --rm \
  -p 80:8080 \
  -e "JWT_SIGNING_KEY=$JWT_SIGNING_KEY" \
  -e "DB_URL=$DB_URL" \
  public.ecr.aws/c6p3f3e9/todo:latest
```

The live version above runs on [AWS App Runner](https://aws.amazon.com/apprunner/), which provides scaling and monitoring.

## Development

To develop todo, you will need Docker Engine, a POSIX shell, and a PostreSQL instance. Run `reset` through `psql` and set the `JWT_SIGNING_KEY` and `DB_URL` environment variables as described in the Installation section. Then use `run.sh` to build and run the application image. You may specify a name and optional tag for the image (the default is todo:latest). I.e.,
```
./run.sh <name:tag>
```

Connect to the application on port 8080. E.g. https://localhost:8080.
