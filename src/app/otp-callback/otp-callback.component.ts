import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TokenStorageService } from '../services/shared/token-storage.service';

@Component({
  selector: 'app-otp-callback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './otp-callback.component.html',
  styleUrl: './otp-callback.component.scss'
})
export class OtpCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tokenStore = inject(TokenStorageService);

  statusMessage = 'Validando OTP...';

  ngOnInit(): void {
    const status =
      this.route.snapshot.queryParamMap.get('status') ??
      this.route.snapshot.queryParamMap.get('estatus');
    const isOk = (status ?? '').toUpperCase() === 'OK';
    const target = this.tokenStore.getOtpTarget();

    this.tokenStore.clearOtpTarget();

    if (isOk) {
      this.tokenStore.setOtpVerified(true);
      if (target?.clientId && target?.businessId != null) {
        this.router.navigate(['/', target.clientId, target.businessId], {
          state: {
            commercialName: target.commercialName ?? '',
            advertiserName: target.advertiserName ?? ''
          }
        });
        return;
      }
      this.router.navigateByUrl('/');
      return;
    }

    this.tokenStore.setOtpVerified(false);
    if (target?.clientId) {
      this.router.navigate(['/', target.clientId]);
      return;
    }
    this.router.navigateByUrl('/');
  }
}
