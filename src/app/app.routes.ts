import { Routes } from '@angular/router';
import { authGuard, guestGuard } from '../guard/auth-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'upload', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('../component/login/login').then(m => m.Login),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('../component/register/register').then(m => m.Register),
  },
  {
    path: 'upload',
    canActivate: [authGuard],
    loadComponent: () => import('../component/upload/upload').then(m => m.Upload),
  },
  {
    path: 'files',
    canActivate: [authGuard],
    loadComponent: () => import('../component/files/files').then(m => m.Files),
  },
  { path: '**', redirectTo: 'upload' },
];
