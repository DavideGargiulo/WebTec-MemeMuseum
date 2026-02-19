import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, Mic, User, Calendar } from 'lucide-angular';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule, FormsModule],
  templateUrl: './navbar.html',
})
export class NavbarComponent {
  
  private router = inject(Router);

  searchQuery = '';
  searchDate = '';

  readonly icons = { 
    Search, 
    Mic, 
    User,
    Calendar
  };

  onSearch() {
    const queryParams: any = {};

    if (this.searchQuery.trim()) {
      queryParams.tags = this.searchQuery.trim();
    }

    if (this.searchDate) {
      // Usiamo la stessa data come inizio e fine per cercare in quel giorno specifico
      queryParams.startDate = this.searchDate;
      queryParams.endDate = this.searchDate;
    }

    // Navighiamo verso la pagina di ricerca passando i parametri nell'URL
    this.router.navigate(['/search'], { queryParams });
  }
}