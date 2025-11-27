import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { BusinessService } from '../services/business.service';
import { BusinessForm } from '../models/form-schema.model';
import { DynamicFormComponent } from '../dynamic-form/dynamic-form.component';

@Component({
  selector: 'app-business-form',
  standalone: true,
  imports: [CommonModule, DynamicFormComponent],
  templateUrl: './business-form.component.html',
  styleUrl: './business-form.component.scss'
})
export class BusinessFormComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly businessService = inject(BusinessService);

  clientId = this.route.snapshot.paramMap.get('idClient') ?? '';
  businessId = this.route.snapshot.paramMap.get('businessId') ?? '';
  formSchema$: Observable<BusinessForm> = this.businessService.getBusinessForm(this.businessId);
  commercialName =
    this.router.getCurrentNavigation()?.extras.state?.['commercialName'] ??
    history.state?.commercialName ??
    '';
  advertiserName =
    this.router.getCurrentNavigation()?.extras.state?.['advertiserName'] ??
    history.state?.advertiserName ??
    '';

  handleSubmit(payload: Record<string, unknown>): void {
    // Placeholder: aquí podríamos postear al backend
    console.info('Payload a enviar:', payload);
  }
}
