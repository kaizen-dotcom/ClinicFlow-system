import { Routes } from '@angular/router';

import { Login } from './auth/login/login';
import { Signup } from './auth/sign-up/sign-up';
import { AuthLayout } from './layouts/auth-layout/auth-layout';
import { guestGuard, roleGuard } from './auth/role.guard';

export const routes: Routes = [
  // 1. AUTH PAGES
  {
    path: '',
    component: AuthLayout,
    children: [
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      },
      {
        path: 'login',
        title: 'Log in · ClinicFlow',
        component: Login,
        canActivate: [guestGuard]
      },
      {
        path: 'sign-up',
        title: 'Create account · ClinicFlow',
        component: Signup,
        canActivate: [guestGuard]
      }
    ]
  },

  // 2. ADMIN PAGES
  {
    path: 'admin',
    loadComponent: () => import('./layouts/admin-layout/admin-layout').then(m => m.AdminLayoutComponent),
    canActivate: [roleGuard('admin')],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        title: 'Dashboard · ClinicFlow',
        loadComponent: () => import('./adminpages/dashboard/dashboard').then(m => m.DashboardComponent)
      },
      {
        path: 'appointments',
        title: 'Appointments · ClinicFlow',
        loadComponent: () => import('./adminpages/appointments/appointments').then(m => m.AppointmentsComponent)
      },
      {
        path: 'patients',
        title: 'Patients · ClinicFlow',
        loadComponent: () =>
          import('./adminpages/patients/patients').then(m => m.PatientsComponent)
      },
      {
        path: 'doctors',
        title: 'Doctors · ClinicFlow',
        loadComponent: () =>import('./adminpages/doctors/doctors').then(m => m.Doctors)
      },
      {
        path: 'schedules',
        title: 'Schedules · ClinicFlow',
        loadComponent: () => import('./adminpages/schedules/schedules').then(m => m.Schedules)
      },
      {
        path: 'reports',
        title: 'Reports · ClinicFlow',
        loadComponent: () => import('./adminpages/reports/reports').then(m => m.Reports)
      },
      {
        path: 'settings',
        title: 'Profile & settings · ClinicFlow',
        loadComponent: () => import('./adminpages/settings/settings').then(m => m.Settings)
      }

    ]
  },

  // 3. PATIENT PAGES
  {
    path: 'patient',
    loadComponent: () => import('./layouts/patient-layout/patient-layout').then(m => m.PatientLayoutComponent),
    canActivate: [roleGuard('patient')],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        title: 'Dashboard · ClinicFlow',
        loadComponent: () => import('./patientpages/dashboard/dashboard').then(m => m.DashboardComponent)
      },
      {
        path: 'browse-doctors',
        title: 'Browse doctors · ClinicFlow',
        loadComponent: () => import('./patientpages/browse-doctors/browse-doctors').then(m => m.BrowseDoctors)
      },
      {
        path: 'doctor-details/:id',
        title: 'Doctor details · ClinicFlow',
        loadComponent: () => import('./patientpages/doctor-details/doctor-details').then(m => m.DoctorDetails)
      },
      {
        path: 'appointments',
        title: 'My appointments · ClinicFlow',
        loadComponent: () => import('./patientpages/appointments/appointments').then(m => m.MyAppointments)
      },
      {
        path: 'notifications',
        title: 'Notifications · ClinicFlow',
        loadComponent: () => import('./patientpages/notifications/notifications').then(m => m.Notifications)
      },
      {
        path: 'profile',
        title: 'My profile · ClinicFlow',
        loadComponent: () => import('./patientpages/my-profile/my-profile').then(m => m.MyProfile)
      }
    ]
  },

  // 4. UNKNOWN URLS
  { path: '**', redirectTo: 'login' }
];
