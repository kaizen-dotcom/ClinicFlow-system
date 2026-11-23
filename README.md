# ClinicFlow API

ASP.NET Core Web API (.NET 10) + MySQL 8 backend for the ClinicFlow Angular app.

## Setup (once)

1. **Create the database and a dedicated MySQL user** (run in MySQL Workbench or `mysql -u root -p`):

   ```sql
   CREATE DATABASE clinicflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'clinicflow'@'localhost' IDENTIFIED BY 'choose-a-strong-password';
   GRANT ALL PRIVILEGES ON clinicflow.* TO 'clinicflow'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. **Store the connection string in .NET User Secrets** (kept in your Windows profile, never in the repo):

   ```bash
   dotnet user-secrets set "ConnectionStrings:ClinicFlow" "server=localhost;port=3306;database=clinicflow;user=clinicflow;password=choose-a-strong-password" --project ClinicFlow.Api
   ```

   A random `Jwt:Key` (token signing key) is already stored in User Secrets. To rotate it:
   `dotnet user-secrets set "Jwt:Key" "<at least 32 random characters>" --project ClinicFlow.Api`

3. **Run the API**

   ```bash
   dotnet run --project ClinicFlow.Api --launch-profile http
   ```

   In Development the API applies migrations and seeds demo data automatically on first start.
   It listens on <http://localhost:5238>; health check: <http://localhost:5238/api/health>.
   OpenAPI document: <http://localhost:5238/openapi/v1.json>.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@clinicflow.com` | `Admin@123` |
| Patient | `emma.wilson@example.com` | `Patient@123` (all demo patients; Lucas Taylor is inactive) |

Reset demo data (Development only): `POST /api/admin/reset-demo` as admin, or the button in the admin Settings page.

## Endpoints

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/login`, `POST /api/auth/register` |
| Doctors | `GET /api/doctors`, `GET /api/doctors/{id}`, `GET /api/doctors/{id}/slots?date=`, `GET /api/doctors/{id}/available-dates`, `POST`/`PUT` (admin) |
| Availability | `GET /api/availability?from=&to=` — schedule blocks + booked times (no patient data) |
| Appointments | `GET /api/appointments` (admin: all, patient: own), `GET /api/appointments/{id}`, `POST /api/appointments`, `POST /api/appointments/{id}/approve\|reject\|complete` (admin), `POST /api/appointments/{id}/cancel` |
| Patients | `GET /api/patients` (admin), `GET/PUT /api/patients/me`, `GET/PUT /api/patients/{id}`, `POST /api/patients` (admin, front-desk), `PUT /api/patients/{id}/status` (admin) |
| Schedules | `POST /api/schedules`, `DELETE /api/schedules/{id}` (admin) |
| Notifications | `GET /api/notifications`, `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all` (patient) |
| Admin | `GET/PUT /api/admin/profile`, `POST /api/admin/password`, `POST /api/admin/reset-demo` |

Errors are returned as `{ "error": "message" }` with a matching status code (400, 401, 403, 404, 409, 429).

## Rules enforced by the server

- Bookings must fall inside a doctor's schedule, in the future, for an active doctor and active patient.
- No double-booking: a unique index on `Appointments.ActiveSlotKey` (doctor + date + time for pending/approved
  appointments) rejects simultaneous bookings at the database level.
- Status flow: Pending → Approved/Rejected/Cancelled, Approved → Completed/Cancelled. Rejections need a reason.
- Every status change notifies the patient.
- Patients only ever see their own records; admin endpoints require the Admin role.
- Passwords are hashed (ASP.NET Core Identity PBKDF2); login/register are rate-limited (10/min per IP).

## Database migrations

```bash
dotnet tool restore
dotnet ef migrations add <Name> --project ClinicFlow.Api --output-dir Data/Migrations
dotnet ef database update --project ClinicFlow.Api
```

## Tests

```bash
dotnet test
```

Unit tests cover the booking rules; API tests run the whole app in memory (no MySQL needed) and check auth, roles and data isolation.
