// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { guestGuard } from './_guards/guest/guest.guard';
import { MemeCardComponent } from './_internalComponents/meme-card/meme-card';

export const routes: Routes = [
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
  },
  { path: 'test-isolato', component: MemeCardComponent },
  
  // AGGIUNGI QUESTA ROTTA:
  {
    path: 'demo-statico',
    loadComponent: () => import('./_internalComponents/demo-feed/demo-feed').then(m => m.DemoFeedComponent)
  }
];