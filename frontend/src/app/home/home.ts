import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // FONDAMENTALE PER LA TENDINA
import { MemeService } from '../_services/meme/meme.service';
import { Meme } from '../_types/meme.type';
import { MemeCardComponent } from '../_internalComponents/meme-card/meme-card';
import { LucideAngularModule, ChevronLeft, ChevronRight, Loader2 } from 'lucide-angular';

@Component({
  selector: 'app-home',
  standalone: true,
  // Aggiunto FormsModule
  imports: [CommonModule, MemeCardComponent, LucideAngularModule, FormsModule],
  templateUrl: './home.html',
})
export class HomeComponent implements OnInit {
  private memeService = inject(MemeService);
  private cdr = inject(ChangeDetectorRef);

  readonly icons = { ChevronLeft, ChevronRight, Loader2 };

  memes: Meme[] = [];
  paginatedMemes: Meme[] = [];
  isLoading = true;

  selectedSort = 'date_DESC';

  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;

  ngOnInit() {
    this.loadMemes();
  }

  loadMemes() {
    this.isLoading = true;
    this.memeService.getAllMemes().subscribe({
      next: (response) => {
        this.memes = response.data.memes.map((m: any) => {
          const voteArray = m.votes || m.Votes;
          let userVote = null;

          if (voteArray && Array.isArray(voteArray) && voteArray.length > 0) {
            userVote = voteArray[0].isUpvote;
          }

          return {
            id: m.id,
            title: m.title,
            description: m.description,
            imageUrl: `http://localhost:3000/uploads/${m.fileName}`,
            author: m.user ? m.user.username : 'Utente',
            authorId: m.userId,
            tags: m.tags ? m.tags.map((t: any) => t.name) : [],
            likes: m.upvotesNumber || 0,
            dislikes: m.downvotesNumber || 0,
            isLiked: userVote
          };
        });
        this.calculatePagination();
        this.updatePaginatedMemes();
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSortChange() {
    this.sortMemes();
    this.currentPage = 1;
    this.updatePaginatedMemes();
  }

  sortMemes() {
    const [sortBy, sortDir] = this.selectedSort.split('_');

    this.memes.sort((a, b) => {
      let valA, valB;

      switch (sortBy) {
        case 'date':
          valA = a.date.getTime();
          valB = b.date.getTime();
          break;
        case 'score':
          valA = a.likes - a.dislikes;
          valB = b.likes - b.dislikes;
          break;
        case 'upvotes':
          valA = a.likes;
          valB = b.likes;
          break;
        case 'downvotes':
          valA = a.dislikes;
          valB = b.dislikes;
          break;
        default:
          valA = a.date.getTime();
          valB = b.date.getTime();
      }

      // Seleziona la direzione
      if (sortDir === 'ASC') {
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      } else {
        return valA < valB ? 1 : valA > valB ? -1 : 0;
      }
    });
  }

  calculatePagination() {
    this.totalPages = Math.ceil(this.memes.length / this.itemsPerPage) || 1;
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
        pages.push(1, -1, this.currentPage - 1, this.currentPage, this.currentPage + 1, -1, this.totalPages);
      }
    }
    return pages;
  }
}