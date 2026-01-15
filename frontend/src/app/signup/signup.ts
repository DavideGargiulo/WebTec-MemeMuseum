// frontend/src/app/signup/signup.ts
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../_services/auth/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './signup.html',
})
export class SignupComponent {
  
  signupForm: FormGroup;
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(
    private fb: FormBuilder, 
    private router: Router,
    private authService: AuthService
  ) {
    this.signupForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  // Validatore personalizzato per controllare che le password coincidano
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  onSubmit() {
    if (this.signupForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      
      // Estraiamo solo i dati che servono al backend (escludiamo confirmPassword)
      const { username, email, password } = this.signupForm.value;

      this.authService.register({ username, email, password }).subscribe({
        next: () => {
          console.log('Registrazione completata!');
          this.router.navigate(['/']); // Va alla home già loggato
        },
        error: (err) => {
          this.isLoading.set(false);
          // Gestione errori specifica dal backend
          if (err.error && err.error.message) {
            this.errorMessage.set(err.error.message); // Es. "Email già in uso"
          } else {
            this.errorMessage.set('Si è verificato un errore. Riprova.');
          }
        }
      });
    } else {
      this.signupForm.markAllAsTouched();
    }
  }
}