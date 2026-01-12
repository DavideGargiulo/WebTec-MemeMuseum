import { Routes } from '@angular/router';
import { LoginComponent } from './login/login';

export const routes: Routes = [
  // Rotta di default (reindirizza alla home)
  { 
    path: '', redirectTo: 'home', pathMatch: 'full' 
  },
  {
    path: 'login', 
    loadComponent: () => import('./login/login').then(m => m.LoginComponent)
  }
  
  // Le rotte della sidebar
  // { 
  //   path: 'home', 
  //   loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent) 
  //   // NOTA: Se non hai ancora il componente Home, usa un componente provvisorio
  // },
  // { 
  //   path: 'notifications', 
  //   loadComponent: () => import('./pages/notifications/notifications').then(m => m.NotificationsComponent) 
  // },
  // { 
  //   path: 'create', 
  //   loadComponent: () => import('./pages/create/create').then(m => m.CreateComponent) 
  // },
  // { 
  //   path: 'messages', 
  //   loadComponent: () => import('./pages/messages/messages').then(m => m.MessagesComponent) 
  // },
  
  // // Rotta per il login (già presente nella navbar)
  // { 
  //   path: 'login', 
  //   loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent) 
  // }
];