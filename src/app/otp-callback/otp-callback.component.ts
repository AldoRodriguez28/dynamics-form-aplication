import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OtpRedeemResult } from '../resolvers/otp-callback.resolver';

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

  statusMessage = 'Validando OTP...';

  ngOnInit(): void {

    const redeem = this.route.snapshot.data['otpRedeem'] as OtpRedeemResult | undefined;
    if (
      redeem?.status === 200 &&
      redeem?.isVerified === true &&
      redeem?.clientId &&
      redeem?.businessId
    ) {
      this.router.navigateByUrl(`/${redeem.clientId}/${redeem.businessId}`);
      return;
    }

    this.statusMessage = redeem?.message ?? 'Sin respuesta de redención.';
  }
}
