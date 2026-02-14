import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Home, SquarePlus, Settings, Star } from 'lucide-angular';
import { SettingsMenuComponent } from '../setting-menu/setting-menu';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule, SettingsMenuComponent],
  templateUrl: './sidebar.html',
})
export class SidebarComponent {
  
  readonly icons = { 
    Home,
    SquarePlus,
    Star,
    Settings 
  };

  isSettingsOpen = signal(false);

  toggleSettings() {
    this.isSettingsOpen.update(v => !v);
  }
}