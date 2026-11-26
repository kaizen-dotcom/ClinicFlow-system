# ClinicFlow API

ASP.NET Core Web API (.NET 10) + MySQL 8 backend for the ClinicFlow Angular app.

## Setup (once)

1. **Create an empty MySQL database** (MySQL Workbench or `mysql -u root -p`):

   ```sql
   CREATE DATABASE clinicflow_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

   For anything beyond local development, use a dedicated MySQL user with rights on this database only instead of `root`.

2. **Store the settings in .NET User Secrets** (kept in your Windows profile, never in the repo):

   ```bash
   dotnet user-secrets set "ConnectionStrings:ClinicFlow" "server=localhost;port=3306;database=clinicflow_db;user=YOUR_USER;password=YOUR_PASSWORD" --project ClinicFlow.Api
   dotnet user-secrets set "Admin:Email" "admin@clinicflow.com" --project ClinicFlow.Api
   dotnet user-secrets set "Admin:Password" "<at least 8 characters>" --project ClinicFlow.Api
   dotnet user-secrets set "Jwt:Key" "<at least 32 random characters>" --project ClinicFlow.Api
   ```

3. **Trust the local HTTPS certificate** (once per computer; accept the Windows prompt)

   ```bash
   dotnet dev-certs https --trust
   ```

4. **Run the API**

   ```bash
   dotnet run --project ClinicFlow.Api --launch-profile https
   ```

   In Development the API creates/updates the tables on start. If there is no administrator yet, it creates one
   from the `Admin:*` settings (optional: `Admin:FullName`, `Admin:Phone`, `Admin:ClinicName`).
   It listens on <https://localhost:7043> (HTTPS only); health check: <https://localhost:7043/api/health>.
   OpenAPI document: <https://localhost:7043/openapi/v1.json>.

## First use

The database starts empty. Sign in as the administrator, then:

1. **Profile & settings**: enter your name, clinic name and phone (the phone is shown to patients), and change the password.
2. **Doctors**: add your doctors.
3. **Schedules**: add each doctor's working hours so patients can book.

Patients sign up themselves, or are registered at the front desk under **Patients**.

## Endpoints

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/password` (change own password) |
| Doctors | `GET /api/doctors`, `GET /api/doctors/{id}`, `GET /api/doctors/{id}/slots?date=`, `GET /api/doctors/{id}/available-dates`, `POST`/`PUT` (admin) |
| Availability | `GET /api/availability?from=&to=` — schedule blocks + booked times (no patient data) |
| Appointments | `GET /api/appointments` (admin: all, patient: own), `GET /api/appointments/{id}`, `POST /api/appointments`, `POST /api/appointments/{id}/approve\|reject\|complete` (admin), `POST /api/appointments/{id}/no-show` (admin), `POST /api/appointments/{id}/cancel\|reschedule` |
| Patients | `GET /api/patients` (admin), `GET/PUT /api/patients/me`, `GET/PUT /api/patients/{id}`, `POST /api/patients` (admin, front-desk), `PUT /api/patients/{id}/status`, `POST /api/patients/{id}/reset-password` (admin) |
| Schedules | `POST /api/schedules`, `DELETE /api/schedules/{id}` (admin) |
| Notifications | `GET /api/notifications`, `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all` (patient) |
| Admin | `GET/PUT /api/admin/profile` |
| Clinic | `GET /api/clinic` (public: name and phone) |

Errors are returned as `{ "error": "message" }` with a matching status code (400, 401, 403, 404, 409, 429).

## Rules enforced by the server

- Bookings must fall inside a doctor's schedule, in the future, for an active doctor and active patient.
- No double-booking: a unique index on `Appointments.ActiveSlotKey` (doctor + date + time for pending/approved
  appointments) rejects simultaneous bookings at the database level.
- Status flow: Pending → Approved/Rejected/Cancelled/Expired, Approved → Completed/No-show/Cancelled. Rejections need a reason.
- A patient can't have two appointments at the same time, or more than 3 requests waiting for review.
- A visit can only be completed or marked no-show once it has started. Requests not reviewed by then expire.
- Rescheduling keeps the same doctor; a patient's change goes back to Pending.
- Patients can't cancel or move a visit whose time has passed.
- Putting a doctor on leave notifies patients with upcoming visits; their requests can't be approved meanwhile.
- Changing or resetting a password, or deactivating a patient, ends that account's existing sessions immediately.
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
