import { Component, inject, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Meme } from '../../_types/meme.type';
import {
  LucideAngularModule, ChevronUp, ChevronDown, Trash2, Pencil,
  ChevronLeft, ChevronRight, Share2, X, Loader2
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
export class MemeCardComponent {
  @Input({ required: true }) meme!: Meme;

  readonly icons = { ChevronUp, ChevronDown, Trash2, Pencil, ChevronLeft, ChevronRight, Share2, X, Loader2 };

  private authService = inject(AuthService);
  private memeService = inject(MemeService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  showDeleteModal = false;
  isDeleting = false;
  isVoting = false;

  getInitials(name: string): string {
    return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').substring(0, 2);
  }

  isOwner(meme: Meme): boolean {
    const currentUser = this.authService.currentUser();
    if (!currentUser || !meme.authorId) return false;
    return currentUser.id === meme.authorId;
  }

  openDeleteModal(event: Event) {
    event.stopPropagation();
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    if (this.isDeleting) return;
    this.showDeleteModal = false;
  }

  confirmDelete() {
    if (this.isDeleting) return;
    this.isDeleting = true;

    this.memeService.deleteMeme(this.meme.id).subscribe({
      next: () => {
        this.isDeleting = false;
        this.showDeleteModal = false;
        // Ricarica la pagina o emetti un evento per avvisare il genitore che il meme è stato eliminato
        window.location.reload(); 
      },
      error: (error) => {
        console.error('Errore durante l\'eliminazione:', error);
        this.isDeleting = false;
      }
    });
  }

  vote(isUpvote: boolean) {
    if (!this.authService.currentUser()) {
      this.router.navigate(['/login']);
      return;
    }
    if (this.isVoting) return;

    this.isVoting = true;
    const previousVote = this.meme.isLiked ?? null;
    this.applyOptimisticVote(isUpvote);

    this.memeService.voteMeme(this.meme.id, isUpvote).subscribe({
      next: (response: any) => {
        this.meme.likes = response.data.upvotesNumber;
        this.meme.dislikes = response.data.downvotesNumber;
        this.meme.isLiked = response.data.userVote;
        this.isVoting = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Errore durante il voto:', error);
        this.revertOptimisticVote(previousVote);
        this.isVoting = false;
        this.cdr.detectChanges();
      }
    });
  }

  private applyOptimisticVote(isUpvote: boolean) {
    if (this.meme.isLiked === isUpvote) {
      isUpvote ? this.meme.likes-- : this.meme.dislikes--;
      this.meme.isLiked = null;
    } else {
      if (this.meme.isLiked !== null) {
        this.meme.isLiked ? this.meme.likes-- : this.meme.dislikes--;
      }
      isUpvote ? this.meme.likes++ : this.meme.dislikes++;
      this.meme.isLiked = isUpvote;
    }
    this.cdr.detectChanges();
  }

  private revertOptimisticVote(previousVote: boolean | null) {
    // Fallback in caso di errore
    this.memeService.getMemeById(this.meme.id).subscribe({
      next: (response: any) => {
        const fresh = response.data;
        if (fresh) {
          this.meme.likes = fresh.upvotesNumber || 0;
          this.meme.dislikes = fresh.downvotesNumber || 0;
          this.meme.isLiked = previousVote;
        }
      }
    });
  }
}