import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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

  statusMessage = 'Validando OTP...';

  ngOnInit(): void {
    const redeem = this.route.snapshot.data['otpRedeem'] as OtpRedeemResult | undefined;
    this.statusMessage = redeem?.message ?? 'Sin respuesta de redención.';
  }
}
