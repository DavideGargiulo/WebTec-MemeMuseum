import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Meme } from '../../_types/meme.type';
import {
  LucideAngularModule,
  ChevronUp,
  ChevronDown,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight
} from 'lucide-angular';

@Component({
  selector: 'app-meme-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  styles: [`
    .break-inside-avoid {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  `],
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
    ChevronRight
  };

  // Paginazione
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  paginatedMemes: Meme[] = [];

  ngOnInit() {
    // 🔥 MOCK DATA (solo se non arrivano meme dall'esterno)
    if (this.memes.length === 0) {
      this.memes = this.getMockMemes();
    }

    this.calculatePagination();
    this.updatePaginatedMemes();
  }

  private getMockMemes(): Meme[] {
    return [
      {
        id: 1,
        title: 'Angular Developer Starter Pack',
        imageUrl: 'https://i.imgflip.com/30b1gx.jpg',
        author: 'Mario Rossi',
        tags: ['angular', 'frontend', 'dev'],
        likes: 124,
        comments: 12,
        description: 'Quando scopri che Angular ha ancora un altro decorator.',
        date: new Date('2024-10-12'),
        isLiked: false
      },
      {
        id: 2,
        title: 'Works on my machine',
        imageUrl: 'https://i.imgflip.com/1bij.jpg',
        author: 'Luigi Verdi',
        tags: ['bug', 'backend', 'classic'],
        likes: 342,
        comments: 45,
        description: 'Il deploy in produzione è sempre una sorpresa.',
        date: new Date('2024-11-02'),
        isLiked: true
      },
      {
        id: 3,
        title: 'Dark Mode Everywhere',
        imageUrl: 'https://i.imgflip.com/4t0m5.jpg',
        author: 'Giulia Bianchi',
        tags: ['dark-mode', 'ui', 'ux'],
        likes: 89,
        comments: 7,
        description: 'Se non ha la dark mode, non è una vera app.',
        date: new Date('2024-12-01'),
        isLiked: false
      },
      {
        id: 4,
        title: 'Just one more feature',
        imageUrl: 'https://i.imgflip.com/26am.jpg',
        author: 'Dev Ninja',
        tags: ['scope-creep', 'agile'],
        likes: 201,
        comments: 19,
        description: 'È sempre solo “un’ultima feature”, vero?',
        date: new Date('2025-01-05'),
        isLiked: false
      },
      {
        id: 5,
        title: 'CSS be like',
        imageUrl: 'https://i.imgflip.com/1otk96.jpg',
        author: 'CSS Wizard',
        tags: ['css', 'frontend', 'pain'],
        likes: 512,
        comments: 88,
        description: 'Perché questo div non si centra?!',
        date: new Date('2025-01-10'),
        isLiked: true
      },
      {
        id: 5,
        title: 'CSS be like',
        imageUrl: 'https://i.imgflip.com/1otk96.jpg',
        author: 'CSS Wizard',
        tags: ['css', 'frontend', 'pain'],
        likes: 512,
        comments: 88,
        description: 'Perché questo div non si centra?!',
        date: new Date('2025-01-10'),
        isLiked: true
      },
      {
        id: 5,
        title: 'CSS be like',
        imageUrl: 'https://i.imgflip.com/1otk96.jpg',
        author: 'CSS Wizard',
        tags: ['css', 'frontend', 'pain'],
        likes: 512,
        comments: 88,
        description: 'Perché questo div non si centra?!',
        date: new Date('2025-01-10'),
        isLiked: true
      },
      {
        id: 5,
        title: 'CSS be like',
        imageUrl: 'https://i.imgflip.com/1otk96.jpg',
        author: 'CSS Wizard',
        tags: ['css', 'frontend', 'pain'],
        likes: 512,
        comments: 88,
        description: 'Perché questo div non si centra?!',
        date: new Date('2025-01-10'),
        isLiked: true
      },
      {
        id: 5,
        title: 'CSS be like',
        imageUrl: 'https://i.imgflip.com/1otk96.jpg',
        author: 'CSS Wizard',
        tags: ['css', 'frontend', 'pain'],
        likes: 512,
        comments: 88,
        description: 'Perché questo div non si centra?!',
        date: new Date('2025-01-10'),
        isLiked: true
      },
      {
        id: 5,
        title: 'CSS be like',
        imageUrl: 'https://i.imgflip.com/1otk96.jpg',
        author: 'CSS Wizard',
        tags: ['css', 'frontend', 'pain'],
        likes: 512,
        comments: 88,
        description: 'Perché questo div non si centra?!',
        date: new Date('2025-01-10'),
        isLiked: true
      }
    ];
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
}
