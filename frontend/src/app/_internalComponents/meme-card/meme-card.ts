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
  Share2,
  X,
  Loader2
} from 'lucide-angular';
import { AuthService } from '../../_services/auth/auth.service';
import { MemeService } from '../../_services/meme/meme.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-meme-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterLink],
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
    Share2,
    X,
    Loader2
  };

  private authService = inject(AuthService);
  private memeService = inject(MemeService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  paginatedMemes: Meme[] = [];

  showDeleteModal = false;
  memeToDelete: Meme | null = null;
  isDeleting = false;
  votingMemeIds = new Set<string>();

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
          
          // Estrazione del voto dell'utente (se presente)
          // Il backend restituisce un array 'votes' che può contenere 0 o 1 elemento
          let userVote = null;
          if (m.votes && m.votes.length > 0) {
            userVote = m.votes[0].isUpvote; // sarà true o false
          }

          const mappedMeme = {
            id: m.id,
            title: m.title,
            description: m.description,
            imageUrl: `http://localhost:3000/uploads/${m.fileName}`,
            author: m.user ? m.user.username : 'Utente',
            authorId: m.userId,
            tags: m.tags ? m.tags.map((t: any) => t.name) : [],
            
            // Mapping contatori
            likes: m.upvotesNumber || 0,
            dislikes: m.downvotesNumber || 0, // Fondamentale per il calcolo del punteggio netto
            comments: m.commentsNumber || 0,
            
            date: new Date(m.createdAt),
            
            // Stato del voto: true (verde), false (rosso), null (grigio)
            isLiked: userVote 
          };
          return mappedMeme;
        });

        this.refreshView();
      },
      error: (error) => {
        console.error('Errore nel caricamento dei meme:', error);
      }
    });
  }

  refreshView() {
    this.calculatePagination();
    this.updatePaginatedMemes();
    this.cdr.detectChanges();
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
          1, -1,
          this.currentPage - 1,
          this.currentPage,
          this.currentPage + 1,
          -1, this.totalPages
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

  isOwner(meme: Meme): boolean {
    const currentUser = this.authService.currentUser();
    if (!currentUser || !meme.authorId) return false;
    return currentUser.id === meme.authorId;
  }

  openDeleteModal(meme: Meme) {
    this.memeToDelete = meme;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    if (this.isDeleting) return; // non chiudere mentre sta eliminando
    this.memeToDelete = null;
    this.showDeleteModal = false;
  }

  confirmDelete() {
    if (!this.memeToDelete || this.isDeleting) return;

    this.isDeleting = true;

    this.memeService.deleteMeme(this.memeToDelete.id).subscribe({
      next: () => {
        this.memes = this.memes.filter(m => m.id !== this.memeToDelete!.id);
        this.isDeleting = false;
        this.memeToDelete = null;
        this.showDeleteModal = false;
        this.refreshView();
      },
      error: (error) => {
        console.error('Errore durante l\'eliminazione:', error);
        this.isDeleting = false;
        // Qui puoi aggiungere un toast/notifica di errore
      }
    });
  }

  vote(meme: Meme, isUpvote: boolean) {
    if (!this.authService.currentUser()) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.votingMemeIds.has(meme.id)) return;

    this.votingMemeIds.add(meme.id);

    const previousVote = meme.isLiked ?? null;
    this.applyOptimisticVote(meme, isUpvote);

    this.memeService.voteMeme(meme.id, isUpvote).subscribe({
      next: (response: any) => {
        // Aggiorna con i valori reali restituiti dal server
        meme.likes    = response.data.upvotesNumber;
        meme.dislikes = response.data.downvotesNumber;
        meme.isLiked = response.data.userVote;
        this.votingMemeIds.delete(meme.id);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Errore durante il voto:', error);
        this.revertOptimisticVote(meme, previousVote);
        this.votingMemeIds.delete(meme.id);
        this.cdr.detectChanges();
      }
    });
  }

  private applyOptimisticVote(meme: Meme, isUpvote: boolean) {
    if (meme.isLiked === isUpvote) {
      // Toggle off: stesso voto → rimuovi
      isUpvote ? meme.likes-- : meme.dislikes--;
      meme.isLiked = null;
    } else {
      // Switch o nuovo voto
      if (meme.isLiked !== null) {
        // Rimuovi il voto opposto
        meme.isLiked ? meme.likes-- : meme.dislikes--;
      }
      isUpvote ? meme.likes++ : meme.dislikes++;
      meme.isLiked = isUpvote;
    }
    this.cdr.detectChanges();
  }

  private revertOptimisticVote(meme: Meme, previousVote: boolean | null) {
    // Ricarica i dati reali in caso di errore
    this.memeService.getAllMemes().subscribe({
      next: (response: any) => {
        const fresh = response.data?.memes?.find((m: any) => m.id === meme.id);
        if (fresh) {
          meme.likes    = fresh.upvotesNumber || 0;
          meme.dislikes = fresh.downvotesNumber || 0;
          meme.isLiked = previousVote;
        }
      }
    });
  }

  isVoting(meme: Meme): boolean {
    return this.votingMemeIds.has(meme.id);
  }
}