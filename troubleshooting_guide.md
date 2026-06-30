# Troubleshooting Guide: Mobile Health-Tech Prototype Launch

This guide provides step-by-step solutions for the common issues encountered during the project launch, specifically addressing database authentication failures and web server 404 errors.

---

## 1. Description of Problems

### Problem A: PostgreSQL Authentication Failure
- **Symptoms**: Error message: `connection failed: connection to server at "127.0.0.1", port 5433 failed: FATAL: password authentication failed for user "postgres"`.
- **Cause**: This occurs when the client (e.g., pgAdmin or the backend) attempts to connect to the PostgreSQL database with an incorrect password, or when the database volume preserves an older password from a previous initialization.

### Problem B: 404 Not Found at /clinic-infrastructure
- **Symptoms**: A white page with the text "404 Not Found" and "nginx/1.29.8" at the bottom.
- **Cause**: Nginx is configured to serve static files. When a user navigates directly to a URL path (like `/clinic-infrastructure`) that doesn't correspond to a physical file on the server, Nginx returns a 404. In Single Page Applications (SPAs) like React, Nginx must be told to fallback to `index.html` for all unknown paths.

---

## 2. Step-by-Step Solutions

### Solution for PostgreSQL Authentication
1. **Verify Credentials**: Open the `.env` file in the root directory. Ensure `POSTGRES_PASSWORD` matches what you are entering in your database tool.
2. **Check Port Mapping**: Ensure you are connecting to port **5433** (the host port) as defined in `docker-compose.yml`, which redirects to the internal container port 5432.
3. **Reset Database Volume (If needed)**: If you changed the password in `.env` AFTER the first launch, Docker might still be using the old one cached in the volume. To force a reset:
   ```bash
   docker-compose down -v
   docker-compose up --build -d
   ```
   *Warning: This will delete all data in the database.*

### Solution for 404 Not Found (Nginx)
1. **Create Nginx Config**: Create a file named `nginx.conf` in the project root with the following content:
   ```nginx
   server {
       listen 80;
       location / {
           root /usr/share/nginx/html;
           try_files $uri $uri/ /index.html;
       }
   }
   ```
2. **Update Dockerfile**: Add `COPY nginx.conf /etc/nginx/conf.d/default.conf` to the production stage of your `Dockerfile`.
3. **Rebuild Container**: Run `docker-compose up --build -d`. This ensures Nginx now passes all routing requests to React's `index.html`.

---

## 3. Troubleshooting pgAdmin4

If you have added pgAdmin4 to your `docker-compose.yml`, use the following steps:

1. **Access pgAdmin**: Go to `http://localhost:5050` in your browser.
2. **Login**: Use the credentials defined in `docker-compose.yml` (e.g., Email: `admin@healthtech.com`, Password: `admin`).
3. **Register Server**:
   - **Name**: HealthTech DB
   - **Host Name/Address**: `healthtech-postgres` (Inside Docker network) OR `localhost` (Outside).
   - **Port**: `5432` (Inside network) OR `5433` (Outside).
   - **Username**: `postgres` (from `.env`)
   - **Password**: `supersecure_db_password` (from `.env`)
4. **Common pgAdmin Issue**: If connection fails with "Timeout", ensure the `healthtech-postgres` container is fully healthy (check `docker ps`).

---

## 4. Potential Pitfalls

- **Cached Layers**: Docker images might not update if you don't use the `--build` flag. Always use `docker-compose up --build` when changing configurations.
- **Port Conflicts**: If port 5433 or 5173 is already in use by another application on your computer, the containers will fail to start. Use `netstat -ano | findstr :5433` on Windows to check for conflicts.
- **Environment Variable Sync**: Ensure there are no spaces around the `=` sign in your `.env` file, as this can cause parsing errors.

---

## 5. Additional Resources

- [Official Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx SPA Configuration Guide](https://nginx.org/en/docs/beginners_guide.html)
- [PostgreSQL Authentication Methods (MD5 vs Scram-SHA-256)](https://www.postgresql.org/docs/current/auth-methods.html)
- [pgAdmin4 Server Registration Guide](https://www.pgadmin.org/docs/pgadmin4/latest/server_dialog.html)
