import { Component, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Moon, LogOut, User, LogIn } from 'lucide-angular';
import { AuthService } from '../../_services/auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-settings-menu',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './setting-menu.html'
})
export class SettingsMenuComponent {
  closeMenu = output<void>();
  
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly icons = { Moon, LogOut, User, LogIn };

  get user() {
    return this.authService.currentUser();
  }

  toggleTheme() {
    document.documentElement.classList.toggle('dark');
  }

  logout() {
    this.closeMenu.emit();
    this.authService.logout();
  }

  goToLogin() {
    this.closeMenu.emit();
    this.router.navigate(['/login'], { 
      queryParams: { returnUrl: this.router.url } 
    });
  }
}