# todo

todo is a to-do list web application. It supports creating, deleting, and updating elements of a large list, as well as signing in and out of user accounts. 

An initial goal of this exercise was to practice building web applications with scalablity and high availability in mind, while getting more experience with React, Go, and PostgreSQL.

An interesting feature of this application is that it uses a "version-checking" approach to detecting concurrency, which keeps the web server stateless. Each list has a version associated with it, which is replicated to each client. When a client attempts to replicate a change to the server, the server checks the version sent along with the change, and if it doesn't match, rejects the change and sends the client a new list snapshot and version. From the user's perspective, when they make a change, the application says that it is "syncing", after which they see any changes that they made from other web browsers (whatever change they made on the current browser is lost). The user can manually "sync" by refreshing the page.

## Installation

1. Set up a PostgreSQL instance. This could be done [with Docker](https://hub.docker.com/_/postgres/), or with some cloud-based offering. I used [AWS RDS](https://aws.amazon.com/rds/postgresql/).
2. Intialize the database by running the `reset` script through `psql`. For example:
```
cd todo
psql -h <host> -p 5432 -U postgres -f reset
```
3. On the web server, install [Go](https://go.dev/) and [NodeJS](https://nodejs.org/).
4. Run `npm clean-install`.
5. Set the `JWT_SIGNING_KEY` environment variable. This should be a 256-bit, base64-encoded string that is kept secret. It is used to authenticate logged in users. The same key should be used on all application instances. If the key changes, users will encounter errors and find themselves logged out. A key can be generated with OpenSSL:
```
openssl rand -base64 32
```
7. Set the `DB_URL` enironment variable. This is the full URL used to connect to the PostreSQL instance, including username and password. E.g.
```
postgres://postgres:<password>@<host>:5432/postgres 
```
7. If using a cloud-managed database, you may need to allow connections from the web server. For example, I usually run the web server on a DigitalOcean droplet, and run the database on RDS. I needed to go into AWS EC2 Management Console > Network and Security > Security Groups, and add an inbound rule for the RDS instance's security group to allow traffic from the droplet's IP address.
8. Run `./run.sh` to start the application, and connect to it on port 8080. E.g. https://localhost:8080. You can sign in with username `default` and password `default`. Currently, the only ways to create additional accounts are to modify `reset`, or use `psql` to insert into the `users` table.
