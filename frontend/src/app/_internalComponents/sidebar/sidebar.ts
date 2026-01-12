import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Home, Bell, SquarePlus, MessageCircle, Settings } from 'lucide-angular';
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
    Bell, 
    SquarePlus, 
    MessageCircle, 
    Settings 
  };

  isSettingsOpen = signal(false);

  toggleSettings() {
    this.isSettingsOpen.update(v => !v);
  }
}