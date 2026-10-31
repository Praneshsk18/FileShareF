import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../service/authService/auth-service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  error = signal('');
  loading = signal(false);

  async onSubmit() {
    this.error.set('');
    if (!this.username || !this.password) {
      this.error.set('Username and password are required.');
      return;
    }

    this.loading.set(true);
    try {
      await firstValueFrom(this.auth.login(this.username, this.password));
      this.router.navigate(['/upload']);
    } catch (e: any) {
      this.error.set(e.error?.message ?? e.message ?? 'Login failed');
    } finally {
      this.loading.set(false);
    }
  }
}
