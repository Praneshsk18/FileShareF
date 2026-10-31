import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../service/authService/auth-service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
})
export class Register {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  email = '';
  password = '';
  error = signal('');
  fieldErrors = signal<Record<string, string>>({});
  loading = signal(false);

  async onSubmit() {
    this.error.set('');
    this.fieldErrors.set({});

    if (!this.username || !this.email || !this.password) {
      this.error.set('All fields are required.');
      return;
    }
    if (this.username.length < 3 || this.username.length > 50) {
      this.error.set('Username must be 3-50 characters.');
      return;
    }
    if (this.password.length < 6) {
      this.error.set('Password must be at least 6 characters.');
      return;
    }

    this.loading.set(true);
    try {
      await firstValueFrom(this.auth.register(this.username, this.email, this.password));
      this.router.navigate(['/upload']);
    } catch (e: any) {
      if (e.error?.validationErrors) {
        this.fieldErrors.set(e.error.validationErrors);
      }
      this.error.set(e.error?.message ?? e.message ?? 'Registration failed');
    } finally {
      this.loading.set(false);
    }
  }
}
