import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { 
  LucideAngularModule, 
  Crown, 
  Heart, 
  MessageCircle, 
  Calendar,
  User,
  Loader2,
  Trophy
} from 'lucide-angular';
import { MemeService } from '../_services/meme/meme.service';

@Component({
  selector: 'app-meme-of-the-day',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './meme-of-the-day.html'
})
export class MemeOfTheDayComponent implements OnInit {
  isLoading = signal<boolean>(true);
  meme = signal<any>(null);

  readonly icons = { Crown, Heart, MessageCircle, Calendar, User, Loader2, Trophy };

  private memeService = inject(MemeService);

  ngOnInit() {
    this.loadMemeOfTheDay();
  }

  loadMemeOfTheDay() {
    this.isLoading.set(true);
    
    this.memeService.getMemeOfTheDay().subscribe({
      next: (response) => {
        const m = response.data;
        
        if (m) {
          this.meme.set({
            id: m.id,
            title: m.title,
            description: m.description,
            imageUrl: `http://localhost:3000/uploads/${m.fileName}`,
            author: m.user?.username || 'Utente Sconosciuto',
            date: new Date(m.createdAt),
            
            // IL PUNTEGGIO NETTO: Upvote meno Downvote
            likes: (m.upvotesNumber || 0) - (m.downvotesNumber || 0),
            
            // Il numero di commenti già presente nel tuo modello
            comments: m.commentsNumber || 0,
            
            // Estraiamo solo i nomi dai Tag relazionati
            tags: m.tags ? m.tags.map((t: any) => t.name) : []
          });
        } else {
          this.meme.set(null);
        }
        
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Errore durante il caricamento del meme del giorno', err);
        this.meme.set(null);
        this.isLoading.set(false);
      }
    });
  }
}