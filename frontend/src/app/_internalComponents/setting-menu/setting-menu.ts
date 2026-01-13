import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Moon, LogOut, User } from 'lucide-angular';
import { AuthService } from '../../_services/auth/auth';

@Component({
  selector: 'app-settings-menu',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './setting-menu.html'
})
export class SettingsMenuComponent {
  closeMenu = output<void>();

  constructor(private readonly authService: AuthService) {}

  readonly icons = { Moon, LogOut, User };

  toggleTheme() {
    document.documentElement.classList.toggle('dark');
  }

  logout() {
    this.closeMenu.emit();
    this.authService.logout();
  }
}
