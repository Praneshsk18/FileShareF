import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../service/authService/auth-service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  // Don't attach token to auth endpoints or external cloud storage
  const isAuthEndpoint = req.url.includes('/api/auth/');
  const isCloudStorageUrl = req.url.includes('backblazeb2.com') || req.url.includes('amazonaws.com');

  if (token && !isAuthEndpoint && !isCloudStorageUrl) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthEndpoint) {
        auth.logout();
      }
      return throwError(() => error);
    })
  );
};
