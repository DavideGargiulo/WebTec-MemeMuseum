import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router'; // Aggiunto Router
import { FormsModule } from '@angular/forms'; // FONDAMENTALE per il menu a tendina
import { MemeService } from '../_services/meme/meme.service'; 
import { LucideAngularModule, SearchX, Loader2 } from 'lucide-angular';
import { MemeCardComponent } from '../_internalComponents/meme-card/meme-card'; 

@Component({
  selector: 'app-search',
  standalone: true,
  // Aggiunto FormsModule agli imports
  imports: [CommonModule, RouterModule, LucideAngularModule, MemeCardComponent, FormsModule],
  templateUrl: './search-result.html',
})
export class SearchComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router); // Iniettato il Router
  private memeService = inject(MemeService);

  readonly icons = { SearchX, Loader2 };

  memes = signal<any[]>([]);
  isLoading = signal<boolean>(true);
  
  pagination = signal<any>({ currentPage: 1, totalPages: 1 });
  currentFilters: any = {};

  selectedSort = 'date_DESC'; 

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
}