import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
// Aggiunto LogOut alle icone
import { LucideAngularModule, Search, Mic, User, Calendar, LogOut } from 'lucide-angular';
// Importiamo il servizio di autenticazione
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

  readonly icons = { 
    Search, 
    Mic, 
    User,
    Calendar,
  };

  onSearch() {
    const queryParams: any = {};

    if (this.searchQuery.trim()) {
      queryParams.tags = this.searchQuery.trim();
    }

    if (this.searchDate) {
      queryParams.startDate = this.searchDate;
      queryParams.endDate = this.searchDate;
    }

    this.router.navigate(['/search'], { queryParams });
  }

  logout() {
    this.authService.logout();
  }
}