import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/internal/operators/catchError';
import { Meme, MemeResponse } from '../../_types/meme.type';
import { Observable } from 'rxjs/internal/Observable';

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
}
