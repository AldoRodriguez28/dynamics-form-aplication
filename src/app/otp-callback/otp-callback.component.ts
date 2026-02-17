import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OtpRedeemResult } from '../resolvers/otp-callback.resolver';
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

    const redeem = this.route.snapshot.data['otpRedeem'] as OtpRedeemResult | undefined;
    if (
      redeem?.status === 200 &&
      redeem?.isVerified === true &&
      redeem?.clientId &&
      redeem?.businessId
    ) {
      const role = (this.tokenStore.getRole() ?? '').toUpperCase();
      if (role === 'CLIENT') {
        const target = this.tokenStore.getOtpTarget();
        const phone = target?.phone ? String(target.phone).trim() : '';
        if (phone) {
          this.tokenStore.addVerifiedOtpNumber(phone);
        }
      }
      this.router.navigateByUrl(`/${redeem.clientId}/${redeem.businessId}`);
      return;
    }

    this.statusMessage = redeem?.message ?? 'Sin respuesta de redención.';
  }
}
