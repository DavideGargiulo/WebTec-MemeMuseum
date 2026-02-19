import { HttpClient, HttpParams } from '@angular/common/http';
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

  deleteMeme(memeId: string){
    return this.http.delete(`${this.apiUrl}/${memeId}`, { withCredentials: true }).pipe(
      tap(() => {
        console.log(`Meme con ID ${memeId} eliminato con successo.`);
      }),
      catchError(error => {
        console.error(`Errore durante l'eliminazione del meme con ID ${memeId}`, error);
        return throwError(() => error);
      })
    );
  }

  voteMeme(memeId: string, isUpvote: boolean): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/${memeId}/vote`,
      { isUpvote },
      { withCredentials: true }
    ).pipe(
      tap(response => console.log(`Voto registrato per meme ${memeId}:`, response)),
      catchError(error => {
        console.error(`Errore voto meme ${memeId}`, error);
        return throwError(() => error);
      })
    );
  }

  getMemeById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  addComment(memeId: string, content: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${memeId}/comments`, { content, withCredentials: true });
  }

  getMemeOfTheDay(): Observable<any> {
    return this.http.get(`${this.apiUrl}/meme-of-the-day`, { withCredentials: true }).pipe(
      tap(response => console.log('Meme del giorno ricevuto:', response)),
      catchError(error => {
        console.error('Errore nel recupero del meme del giorno', error);
        return throwError(() => error);
      })
    );
  }

  searchMemes(filters: any): Observable<any> {
    let params = new HttpParams()
      .set('page', filters.page || 1);

    if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
    if (filters.sortDir) params = params.set('sortDir', filters.sortDir);
    if (filters.startDate) params = params.set('startDate', filters.startDate);
    if (filters.endDate) params = params.set('endDate', filters.endDate);
    
    if (filters.tags) {
      const tagsString = Array.isArray(filters.tags) 
        ? filters.tags.join(',')
        : filters.tags;
        
      params = params.set('tags', tagsString);
    }

    return this.http.get<any>(`${this.apiUrl}/search`, { params });
  }
}