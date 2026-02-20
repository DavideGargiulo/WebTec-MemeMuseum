import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MemeService } from '../_services/meme/meme.service';
import { AuthService } from '../_services/auth/auth.service';
import { CommentService } from '../_services/comment/comment.service';
import { Meme } from '../_types/meme.type';
import {
  LucideAngularModule,
  ChevronUp,
  ChevronDown,
  Send,
  Trash2,
  Loader2
} from 'lucide-angular';
import { ChangeDetectorRef } from '@angular/core';
import { ToastService } from '../_services/toast/toast.service';

interface Comment {
  id: string;
  author: string;
  authorId: string;
  content: string;
  date: Date;
}

@Component({
  selector: 'app-view-meme',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  templateUrl: './view-meme.html'
})
export class ViewMemeComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private memeService = inject(MemeService);
  private authService = inject(AuthService);
  private commentService = inject(CommentService);
  private cdr = inject(ChangeDetectorRef);
  private toastService = inject(ToastService);

  readonly icons = { ChevronUp, ChevronDown, Send, Trash2, Loader2 };

  meme: Meme | null = null;
  comments: any[] = [];
  newComment = '';
  isLoading = true;
  isSendingComment = false;
  isVoting = false;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/']);
      return;
    }
    this.loadMeme(id);
    this.loadComments(id);
  }

  loadMeme(id: string) {
    this.isLoading = true;
    this.memeService.getMemeById(id).subscribe({
      next: (response: any) => {
        const m = response.data;
        console.log('Dati meme:', m);
        let userVote = null;
        if (m.votes && m.votes.length > 0) {
          userVote = m.votes[0].isUpvote;
        }
        this.meme = {
          id: m.id,
          title: m.title,
          description: m.description,
          imageUrl: `http://localhost:3000/uploads/${m.fileName}`,
          author: m.user ? m.user.username : 'Utente',
          authorId: m.userId,
          tags: m.tags ? m.tags.map((t: any) => t.name) : [],
          likes: m.upvotesNumber || 0,
          dislikes: m.downvotesNumber || 0,
          comments: m.commentsNumber || 0,
          date: new Date(m.createdAt),
          isLiked: userVote
        };
        this.comments = (m.comments || []).map((c: any) => ({
          id: c.id,
          author: c.user?.username || 'Utente',
          authorId: c.userId,
          content: c.content,
          date: new Date(c.createdAt)
        }));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastService.error('Errore nel caricamento del meme');
        this.router.navigate(['/']);
      }
    });
  }

  vote(isUpvote: boolean) {
    if (!this.meme || this.isVoting) return;
    if (!this.authService.currentUser()) {
      this.toastService.warning('Devi accedere per poter votare un meme!');
      return;
    }
    
    this.isVoting = true;
    
    this.memeService.voteMeme(this.meme.id, isUpvote).subscribe({
      next: (response: any) => {
        this.meme = {
          ...this.meme!,
          likes: response.data.upvotesNumber,
          dislikes: response.data.downvotesNumber,
          isLiked: response.data.userVote
        };
        
        this.isVoting = false;
        
        this.cdr.detectChanges(); 
      },
      error: (err) => { 
        console.error('Errore voto:', err);
        this.isVoting = false;
        this.toastService.error('Errore durante il voto del meme');
        this.cdr.detectChanges();
      }
    });
  }
  
  getInitials(name: string): string {
    return name.split(' ').map(w => w[0].toUpperCase()).join('').substring(0, 2);
  }

  // Carica i commenti dal backend
  loadComments(memeId: string) {
    this.commentService.getCommentsByMeme(memeId).subscribe({
      next: (data) => {
        // Mappiamo i dati del backend (createdAt, user.username) nei nomi attesi dall'HTML (date, author)
        this.comments = data.map(c => ({
          id: c.id,
          content: c.content,
          author: c.user?.username || 'Utente Sconosciuto',
          userId: c.userId, // Ci serve per verificare se l'utente è il proprietario
          date: c.createdAt
        }));
      },
      error: (err) => {
        console.error('Errore nel caricamento dei commenti:', err);
        this.toastService.error('Errore nel caricamento dei commenti');
      }
    });
  }

  sendComment() {
    // Evita invii vuoti o multipli
    if (!this.newComment.trim() || this.isSendingComment) return;

    this.isSendingComment = true;
    const memeId = this.route.snapshot.paramMap.get('id');

    if (memeId) {
      this.commentService.createComment(memeId, this.newComment).subscribe({
        next: (nuovoCommentoDalDb) => {
          // Formattiamo il nuovo commento come fatto in loadComments
          const commentoFormattato = {
            id: nuovoCommentoDalDb.id,
            content: nuovoCommentoDalDb.content,
            author: nuovoCommentoDalDb.user?.username || 'Io',
            userId: nuovoCommentoDalDb.userId,
            date: nuovoCommentoDalDb.createdAt
          };

          this.comments = [commentoFormattato, ...this.comments];
          
          if (this.meme) {
            this.meme.comments++;
          }

          this.newComment = '';
          this.isSendingComment = false;

          this.cdr.detectChanges(); 
          this.toastService.success('Commento aggiunto con successo!');
        },
        error: (err) => {
          console.error('Errore durante l\'invio del commento:', err);
          this.isSendingComment = false; // Sblocca il pulsante in caso di errore
          this.toastService.error('Errore durante l\'invio del commento');
          this.cdr.detectChanges(); // Aggiorniamo la UI anche in caso di errore
        }
      });
    }
  }
}