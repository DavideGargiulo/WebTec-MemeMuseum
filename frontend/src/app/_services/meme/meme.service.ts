import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/internal/operators/catchError';
import { Meme, MemeResponse } from '../../_types/meme.type';
import { Observable } from 'rxjs/internal/Observable';
import { tap } from 'rxjs/internal/operators/tap';
import { throwError } from 'rxjs/internal/observable/throwError';

@Injectable({
  providedIn: 'root',
})
export class MemeService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly apiUrl = 'http://localhost:3000/api/memes';

  createMeme(formData: FormData): Observable<MemeResponse> {
    return this.http.post<MemeResponse>(
      `${this.apiUrl}/create`, 
      formData, 
      {withCredentials: true}
    ).pipe(
      catchError((err) => {
        console.warn('Errore durante la creazione del meme', err);
        throw err;
      })
    );
  }

  getAllMemes(): Observable<any> {
    return this.http.get<any>(
      this.apiUrl,
      { withCredentials: true }
    ).pipe(
      tap(response => {
        console.log('Memes ricevuti:', response);
      }),
      catchError(error => {
        console.error('Errore nel recupero dei memes', error);
        return throwError(() => error);
      })
    );
  }
}
