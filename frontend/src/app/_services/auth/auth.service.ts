import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, throwError, Observable } from 'rxjs';
import { User, AuthResponse } from '../../_types/auth.type';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  
  private readonly apiUrl = environment.apiUrl;

  currentUser = signal<User | null>(null);

  constructor() { 
    this.checkSessionPersistence();
  }

  login(credentials: {email: string, password: string}): Observable<any> {   
    console.log('Tentativo di login per:', credentials.email);
    return this.http.post<any>(
      `${this.apiUrl}/login`, 
      credentials, 
      { withCredentials: true }
    ).pipe(
      tap(response => {
        const user = response.data?.user || response.user;
        this.handleAuthSuccess(user);
      }),
      catchError(error => {
        console.error('Errore Login', error);
        return throwError(() => error);
      })
    );
  }

  logout() {
    // Chiamiamo il backend per cancellare il cookie 'jwt'
    this.http.post(
      `${this.apiUrl}/logout`, 
      {}, 
      { withCredentials: true }
    ).subscribe({
      next: () => this.doClientLogout(),
      error: (err) => {
        console.warn('Errore logout server (possibile cookie già scaduto)', err);
        this.doClientLogout(); // Eseguiamo comunque il logout locale
      }
    });
  }

  private doClientLogout() {
    this.currentUser.set(null);
    localStorage.removeItem('meme_user');
  }

  private handleAuthSuccess(user: User) {
    if (!user) {
      console.error('Nessun utente trovato nella risposta del login');
      return;
    }
    
    // Salviamo l'utente nel localStorage per la persistenza della UI (refresh pagina)
    // Il token di sicurezza è invece al sicuro nel Cookie HttpOnly
    localStorage.setItem('meme_user', JSON.stringify(user));
    this.currentUser.set(user);
  }

  private checkSessionPersistence() {
    const userJson = localStorage.getItem('meme_user');

    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        
        // A. OTTIMISMO: Impostiamo subito l'utente per la UI (evita flash del login)
        this.currentUser.set(user);

        // B. VERIFICA REALE: Chiediamo al server se il cookie è ancora buono
        this.getMe().subscribe({
          next: () => {
            // Tutto ok, sessione confermata silenziosamente
            console.log('Sessione backend verificata');
          },
          error: (err) => {
            console.warn('Sessione locale scaduta o invalida. Logout forzato.');
            // Il cookie non è valido, quindi puliamo tutto
            this.doClientLogout(); 
          }
        });

      } catch (e) {
        console.error('Dati locali corrotti', e);
        this.doClientLogout();
      }
    }
  }

  register(data: {username: string, email: string, password: string}): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/signup`,
      data,
      { withCredentials: true }
    ).pipe(
      tap(response => {
        const user = response.data?.user || response.user;
        this.handleAuthSuccess(user);
      }),
      catchError(error => {
        console.error('Errore Registrazione', error);
        return throwError(() => error);
      })
    );
  }

  getMe(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/me`,
      { withCredentials: true }
    ).pipe(
      tap(response => {
        const user = response.data?.user || response.user;
        this.updateUserState(user);
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  private updateUserState(user: User) {
    if (!user) return;
    localStorage.setItem('meme_user', JSON.stringify(user));
    this.currentUser.set(user);
  }
}