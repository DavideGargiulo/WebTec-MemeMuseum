import { Component, inject, Input, OnInit, ChangeDetectorRef } from '@angular/core';
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
  private cdr = inject(ChangeDetectorRef);

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
        if (!response.data || !response.data.memes) {
          return;
        }

        const backendMemes = response.data.memes;

        this.memes = backendMemes.map((m: any) => {
          const mappedMeme = {
            id: m.id,
            title: m.title,
            description: m.description,
            imageUrl: `http://localhost:3000/uploads/${m.fileName}`, 
            author: m.user ? m.user.username : 'Utente',
            authorId: m.userId,
            tags: m.tags ? m.tags.map((t: any) => t.name) : [],
            likes: m.upvotesNumber || 0,
            comments: m.commentsNumber || 0,
            date: new Date(m.createdAt),
            isLiked: false 
          };
          console.log('✅ Meme mappato:', mappedMeme);
          return mappedMeme;
        });

        console.log('📊 Array memes finale:', this.memes);
        console.log('📊 Lunghezza array:', this.memes.length);

        // Aggiorna la vista con i nuovi dati
        this.refreshView();
      },
      error: (error) => {
        console.error('Errore nel caricamento dei meme:', error);
      }
    });
  }

  /**
   * Aggiorna la vista dopo aver ricevuto i dati dal backend
   * Ricalcola la paginazione e aggiorna i meme visualizzati
   */
  refreshView() {
    this.calculatePagination();
    this.updatePaginatedMemes();
    
    // Forza Angular a rilevare i cambiamenti
    this.cdr.detectChanges();
    
    console.log('Vista aggiornata - Totale meme:', this.memes.length, 'Pagine:', this.totalPages);
    console.log('Meme paginati:', this.paginatedMemes.length);
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