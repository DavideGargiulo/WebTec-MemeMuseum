import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './_internalComponents/sidebar/sidebar';
import { NavbarComponent } from './_internalComponents/navbar/navbar';
import { ToastComponent } from './_internalComponents/toast/toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent, NavbarComponent, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}