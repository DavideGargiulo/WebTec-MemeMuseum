import { Routes } from '@angular/router';
import { guestGuard } from './_guards/guest/guest.guard';
import { MemeCardComponent } from './_internalComponents/meme-card/meme-card'; 
import { CreaMemeComponent } from './create-meme/create-meme';

export const routes: Routes = [
  { 
    path: '', 
    component: MemeCardComponent, 
    pathMatch: 'full' 
  },
  {
    path: 'create',
    component: CreaMemeComponent 
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
  {
    path: 'viewmeme/:id',
    loadComponent: () => import('./view-meme/view-meme').then(m => m.ViewMemeComponent)
  },
  {
    path: 'meme-of-the-day',
    loadComponent: () => import('./meme-of-the-day/meme-of-the-day').then(m => m.MemeOfTheDayComponent)
  }
];