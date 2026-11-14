import { Routes } from '@angular/router';

import { Login } from './auth/login/login';
import { Signup } from './auth/sign-up/sign-up';
import { AuthLayout } from './layouts/auth-layout/auth-layout';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout';

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
        component: Login
      },
      {
        path: 'sign-up',
        component: Signup
      }
    ]
  },

  // 2. ADMIN PAGES
  {
    path: 'admin',
    component: AdminLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./adminpages/dashboard/dashboard').then(m => m.DashboardComponent)
      },
      {
        path: 'appointments',
        loadComponent: () => import('./adminpages/appointments/appointments').then(m => m.AppointmentsComponent)
      },
      {
        path: 'patients',
        loadComponent: () =>
          import('./adminpages/patients/patients').then(m => m.PatientsComponent)
      },
      {
        path: 'doctors',
        loadComponent: () =>import('./adminpages/doctors/doctors').then(m => m.Doctors)
      },
      {
        path: 'schedules',
        loadComponent: () => import('./adminpages/schedules/schedules').then(m => m.Schedules)
      },
      {
        path: 'reports',
        loadComponent: () => import('./adminpages/reports/reports').then(m => m.Reports)
      },
      {
        path: 'settings',
        loadComponent: () => import('./adminpages/settings/settings').then(m => m.Settings)
      }

    ]
  },

  // 3. Fallback
  {
    path: '**',
    redirectTo: 'login'
  }
];