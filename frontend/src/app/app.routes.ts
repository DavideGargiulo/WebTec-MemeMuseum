import { Routes } from '@angular/router';

export const routes: Routes = [
  // Rotta di default (reindirizza alla home)
  { 
    path: '', redirectTo: 'home', pathMatch: 'full' 
  },
  {
    path: 'login', 
    loadComponent: () => import('./login/login').then(m => m.LoginComponent)
  },
  { 
    path: 'signup',
    loadComponent: () => import('./signup/signup').then(m => m.SignupComponent)
  }
];