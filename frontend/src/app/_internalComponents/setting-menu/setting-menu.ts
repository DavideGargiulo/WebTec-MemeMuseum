import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Moon, LogOut, User } from 'lucide-angular';

@Component({
  selector: 'app-settings-menu',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './setting-menu.html'
})
export class SettingsMenuComponent {
  closeMenu = output<void>();

  readonly icons = { Moon, LogOut, User };

  toggleTheme() {
    document.documentElement.classList.toggle('dark');
  }

  logout() {
    console.log('Eseguo logout...');
    this.closeMenu.emit();
  }
}
