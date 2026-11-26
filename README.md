# ClinicFlowSystem

Clinic appointment system: patients book visits online, clinic staff review and manage them.

## Project structure

| Folder | What it is |
|---|---|
| `src/` | Angular frontend (admin portal + patient portal) |
| `backend/` | ASP.NET Core Web API (.NET 10) + MySQL — see [backend/README.md](backend/README.md) for setup |

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.4.

## Development server

The app needs the API and its MySQL database. Set them up once as described in [backend/README.md](backend/README.md), then run both:

```bash
dotnet dev-certs https --trust   # once per computer
npm run cert                     # once: copies that certificate to .cert/ for the app

dotnet run --project backend/ClinicFlow.Api --launch-profile https  # API on https://localhost:7043
npm start                                                           # app on https://localhost:4200
```

The dev server forwards `/api` requests to the API (see `proxy.conf.json`). A production deployment must serve the API under `/api` on the same address as the app.

Once the server is running, open your browser and navigate to `https://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
