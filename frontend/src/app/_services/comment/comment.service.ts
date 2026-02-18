import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private apiUrl = 'http://localhost:3000/api/comments'; 

  constructor(private http: HttpClient) {}

  getCommentsByMeme(memeId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/meme/${memeId}`);
  }

  createComment(memeId: string, content: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/meme/${memeId}`, 
      { content }, // <-- Body
      { withCredentials: true } // <-- Options
    );
  }
}