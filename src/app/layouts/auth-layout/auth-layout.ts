import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthHeader } from '../../shared/components/auth-header/auth-header';
import { AuthFooter } from '../../shared/components/auth-footer/auth-footer';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, AuthHeader, AuthFooter],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css'
})
export class AuthLayout {}