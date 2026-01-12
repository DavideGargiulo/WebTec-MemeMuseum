import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, throwError, Observable, of } from 'rxjs';
import { User, AuthResponse } from '../../_types/auth-types'; 

import 'dotenv/config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private http = inject(HttpClient);
  private router = inject(Router);
  
  private apiUrl = process.env.LOGIN_AUTH_API_URL; 

  currentUser = signal<User | null>(null);

  constructor() { 
    this.checkLocalStorage();
  }

  login(credentials: {email: string, password: string}): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => this.handleAuthSuccess(response)),
      catchError(error => {
        console.error('Errore Login', error);
        return throwError(() => error);
      })
    );
  }

  // --- LOGOUT ---
  logout() {
    this.currentUser.set(null);
    localStorage.removeItem('meme_token');
    localStorage.removeItem('meme_user');
    this.router.navigate(['/login']);
  }

  private handleAuthSuccess(response: AuthResponse) {
    localStorage.setItem('meme_token', response.token);
    localStorage.setItem('meme_user', JSON.stringify(response.user));
    
    this.currentUser.set(response.user);
  }

  private checkLocalStorage() {
    const userJson = localStorage.getItem('meme_user');
    const token = localStorage.getItem('meme_token');

    if (token && userJson) {
      try {
        this.currentUser.set(JSON.parse(userJson));
      } catch {
        this.logout();
      }
    }
  }
}