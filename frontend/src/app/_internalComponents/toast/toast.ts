import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../_services/toast/toast.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './toast.html'
})
export class ToastComponent {
  toastService = inject(ToastService);
}