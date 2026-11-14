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
        // FIXED: Added 'pages/' to the path
        loadComponent: () => import('./adminpages/dashboard/dashboard').then(m => m.DashboardComponent)
      },
      {
        path: 'appointments',
        // NEW: Added the appointments route
        loadComponent: () => import('./adminpages/appointments/appointments').then(m => m.AppointmentsComponent)
      }
    ]
  },

  // 3. Fallback
  {
    path: '**',
    redirectTo: 'login'
  }
];