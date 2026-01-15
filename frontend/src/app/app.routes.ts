import { Routes } from '@angular/router';
import { guestGuard } from './_guards/guest/guest.guard';

export const routes: Routes = [
  // Rotta di default (reindirizza alla home)
  { 
    path: '', redirectTo: 'home', pathMatch: 'full' 
  },
  {
    path: 'login', 
    loadComponent: () => import('./login/login').then(m => m.LoginComponent),
    canActivate: [guestGuard]
  },
  { 
    path: 'signup',
    loadComponent: () => import('./signup/signup').then(m => m.SignupComponent),
    canActivate: [guestGuard]
  }
];