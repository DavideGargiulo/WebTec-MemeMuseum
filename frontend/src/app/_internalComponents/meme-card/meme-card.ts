import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Meme } from '../../_types/meme.type';
import {
  LucideAngularModule,
  ChevronUp,
  ChevronDown,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Share2
} from 'lucide-angular';
import { AuthService } from '../../_services/auth/auth.service';
import { MemeService } from '../../_services/meme/meme.service';

@Component({
  selector: 'app-meme-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './meme-card.html',
})
export class MemeCardComponent implements OnInit {

  @Input() memes: Meme[] = [];

  readonly icons = {
    ChevronUp,
    ChevronDown,
    Trash2,
    Pencil,
    ChevronLeft,
    ChevronRight,
    Share2
  };

  private authService = inject(AuthService);
  private memeService = inject(MemeService);

  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  paginatedMemes: Meme[] = [];

  ngOnInit() {
    this.loadMemes();
  }

  loadMemes() {
    this.memeService.getAllMemes().subscribe({
      next: (response: any) => {
        console.log('Dati ricevuti:', response); // Debug

        // 1. Mappiamo i dati dal formato Backend al formato Frontend
        // Dallo screen vedo che il backend restituisce: { data: { memes: [...] } }
        const backendMemes = response.data.memes;

        this.memes = backendMemes.map((m: any) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          // Dallo screen vedo 'filename', quindi costruiamo l'URL completo
          imageUrl: `http://localhost:3000/uploads/${m.filename || m.fileName}`, 
          
          // Gestione autore (se il backend non manda l'oggetto user, metti un fallback)
          author: m.user ? m.user.username : 'Utente',
          authorId: m.userId, // Importante per il tasto elimina/modifica
          
          tags: m.tags ? m.tags.map((t: any) => t.name) : [],
          
          // Mappatura contatori (gestisci il caso in cui siano null)
          likes: m.upvotesNumber || 0,
          comments: m.commentsNumber || 0,
          date: new Date(m.createdAt),
          isLiked: false 
        }));

        // 2. 🔥 ORA che abbiamo i dati, calcoliamo la paginazione e aggiorniamo la vista
        this.calculatePagination();
        this.updatePaginatedMemes();
      },
      error: (error) => {
        console.error('Errore nel caricamento dei meme:', error);
      }
    });
  }

  calculatePagination() {
    this.totalPages = Math.ceil(this.memes.length / this.itemsPerPage);
  }

  updatePaginatedMemes() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedMemes = this.memes.slice(startIndex, endIndex);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedMemes();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage() {
    this.goToPage(this.currentPage + 1);
  }

  previousPage() {
    this.goToPage(this.currentPage - 1);
  }

  toggleLike(meme: Meme) {
    meme.isLiked = !meme.isLiked;
    meme.isLiked ? meme.likes++ : meme.likes--;
  }

  editMeme(meme: Meme) {
    console.log('Edit meme:', meme);
  }

  deleteMeme(meme: Meme) {
    const index = this.memes.indexOf(meme);
    if (index > -1) {
      this.memes.splice(index, 1);
      this.calculatePagination();
      if (this.paginatedMemes.length === 1 && this.currentPage > 1) {
        this.currentPage--;
      }
      this.updatePaginatedMemes();
    }
  }

  getLastItemIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.memes.length);
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;

    if (this.totalPages <= maxPagesToShow) {
      for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    } else {
      if (this.currentPage <= 3) {
        pages.push(1, 2, 3, 4, -1, this.totalPages);
      } else if (this.currentPage >= this.totalPages - 2) {
        pages.push(1, -1);
        for (let i = this.totalPages - 3; i <= this.totalPages; i++) pages.push(i);
      } else {
        pages.push(
          1,
          -1,
          this.currentPage - 1,
          this.currentPage,
          this.currentPage + 1,
          -1,
          this.totalPages
        );
      }
    }

    return pages;
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }

  isOwner(meme: Meme): boolean {
    const currentUser = this.authService.currentUser();
    
    if (!currentUser || !meme.authorId) {
      return false;
    }

    return currentUser.id === meme.authorId;
  }
}