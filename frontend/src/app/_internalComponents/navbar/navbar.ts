import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, Mic, User, Calendar, LogOut, Filter } from 'lucide-angular';
import { AuthService } from '../../_services/auth/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule, FormsModule],
  templateUrl: './navbar.html',
})
export class NavbarComponent {
  
  private router = inject(Router);
  authService = inject(AuthService);

  searchQuery = '';
  searchDate = '';
  isDateFilterOpen = false; // <-- Nuova variabile per il menu mobile

  readonly icons = { 
    Search, 
    Mic, 
    User,
    Calendar,
    LogOut,
    Filter // <-- Nuova icona aggiunta
  };

  toggleDateFilter() {
    this.isDateFilterOpen = !this.isDateFilterOpen;
  }

  onSearch() {
    const queryParams: any = {};

    if (this.searchQuery.trim()) {
      queryParams.tags = this.searchQuery.trim();
    }

    if (this.searchDate) {
      queryParams.startDate = this.searchDate;
      queryParams.endDate = this.searchDate;
    }

    this.isDateFilterOpen = false; // Chiude il menu della data se è aperto
    this.router.navigate(['/search'], { queryParams });
  }

  logout() {
    this.authService.logout();
  }
}