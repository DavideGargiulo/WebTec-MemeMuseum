import { Injectable, signal } from '@angular/core';
import { CheckCircle, AlertTriangle, XCircle, X } from 'lucide-angular';

export type ToastType = 'success' | 'error' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  closing?: boolean;
  timeoutId?: any; 
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  readonly icons = { CheckCircle, AlertTriangle, XCircle, X };
  toasts = signal<Toast[]>([]);

  show(type: ToastType, message: string, title?: string) {
    const id = Math.random().toString(36).substring(2, 9);
    
    // Invece di rimuoverlo di botto, inneschiamo l'animazione di chiusura dopo 5 secondi
    const timeoutId = setTimeout(() => {
      this.triggerClose(id);
    }, 2500);

    this.toasts.update(current => [
      ...current, 
      { id, type, message, title, closing: false, timeoutId }
    ]);
  }

  success(message: string, title: string = 'Successo') { this.show('success', message, title); }
  error(message: string, title: string = 'Errore') { this.show('error', message, title); }
  warning(message: string, title: string = 'Attenzione') { this.show('warning', message, title); }

  // 🪄 LA MAGIA DELL'USCITA FLUIDA
  triggerClose(id: string) {
    // 1. Ferma il timer automatico (se l'utente ha cliccato la X a mano)
    const toastToClose = this.toasts().find(t => t.id === id);
    if (toastToClose?.timeoutId) {
      clearTimeout(toastToClose.timeoutId);
    }

    // 2. Imposta closing: true. Il file HTML reagirà aggiungendo le classi di uscita CSS
    this.toasts.update(current => 
      current.map(t => t.id === id ? { ...t, closing: true } : t)
    );

    // 3. Rimuove davvero il toast solo quando l'animazione CSS è finita (300ms)
    setTimeout(() => {
      this.toasts.update(current => current.filter(t => t.id !== id));
    }, 300); 
  }

  getIcon(type: ToastType) {
    switch (type) {
      case 'success': return this.icons.CheckCircle;
      case 'error': return this.icons.XCircle;
      case 'warning': return this.icons.AlertTriangle;
      default: return this.icons.CheckCircle;
    }
  }
}