import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router'; 
import { FormsModule } from '@angular/forms'; 
import { MemeService } from '../_services/meme/meme.service'; 
import { LucideAngularModule, SearchX, Loader2, ChevronLeft, ChevronRight } from 'lucide-angular';
import { MemeCardComponent } from '../_internalComponents/meme-card/meme-card'; 

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, MemeCardComponent, FormsModule],
  templateUrl: './search-result.html',
})
export class SearchComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router); 
  private memeService = inject(MemeService);

  readonly icons = { SearchX, Loader2, ChevronLeft, ChevronRight };

  memes = signal<any[]>([]);
  isLoading = signal<boolean>(true);
  
  pagination = signal<any>({ currentPage: 1, totalPages: 1, limit: 12, totalItems: 0 });
  currentFilters: any = {};

  selectedSort = 'date_DESC'; 

  paginatedMemes = computed(() => this.memes());
  
  currentPage = computed(() => Number(this.pagination().currentPage) || 1);
  totalPages = computed(() => Number(this.pagination().totalPages) || 1);
  itemsPerPage = computed(() => Number(this.pagination().limit) || 12);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.currentFilters = { ...params };

      if (params['sortBy'] && params['sortDir']) {
        this.selectedSort = `${params['sortBy']}_${params['sortDir']}`;
      } else {
        this.selectedSort = 'date_DESC';
      }

      this.performSearch(this.currentFilters);
    });
  }

  onSortChange() {
    const [sortBy, sortDir] = this.selectedSort.split('_');

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sortBy, sortDir, page: 1 },
      queryParamsHandling: 'merge'
    });
  }

  performSearch(filters: any) {
    this.isLoading.set(true);
    
    this.memeService.searchMemes(filters).subscribe({
      next: (response) => {
        const mappedMemes = response.data.map((m: any) => {
          let userVote = null;
          if (m.votes && m.votes.length > 0) {
            userVote = m.votes[0].isUpvote;
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
            comments: m.commentsNumber || 0,
            date: new Date(m.createdAt),
            isLiked: userVote
          };
        });

        this.memes.set(mappedMemes);
        this.pagination.set(response.pagination);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error("Errore ricerca:", err);
        this.isLoading.set(false);
        this.memes.set([]);
      }
    });
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { page: page },
        queryParamsHandling: 'merge'
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage() {
    this.goToPage(this.currentPage() + 1);
  }

  previousPage() {
    this.goToPage(this.currentPage() - 1);
  }

  getLastItemIndex(): number {
    const total = this.pagination().totalItems || (this.currentPage() * this.itemsPerPage());
    return Math.min(this.currentPage() * this.itemsPerPage(), total);
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    const current = this.currentPage();
    const total = this.totalPages();

    if (total <= maxPagesToShow) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      if (current <= 3) {
        pages.push(1, 2, 3, 4, -1, total);
      } else if (current >= total - 2) {
        pages.push(1, -1, total - 3, total - 2, total - 1, total);
      } else {
        pages.push(1, -1, current - 1, current, current + 1, -1, total);
      }
    }
    return pages;
  }
}