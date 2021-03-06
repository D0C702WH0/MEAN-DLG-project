import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot
} from '@angular/router';
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AdminGuard implements CanActivate {

  constructor(private authService: AuthService) {}

  /** Authorize routes if user is Admin */
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | Observable<boolean> | Promise<boolean> {
    const token = localStorage.getItem('token');
    const isAdmin = this.authService.getIsAdmin();
    if (!isAdmin || !token) {
      this.authService.redirect(['/']);
    }
    return isAdmin;
  }
}
