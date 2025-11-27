import { Injectable } from '@angular/core';
import { OptionItem } from '../models/form-schema.model';

@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  private readonly sources: Record<string, OptionItem[]> = {
    REF_CATEGORY: [
      { value: 'retail', label: 'Retail' },
      { value: 'services', label: 'Servicios' },
      { value: 'food', label: 'Alimentos y Bebidas' },
      { value: 'health', label: 'Salud' },
      { value: 'education', label: 'Educación' }
    ],
    REF_SUB_CATEGORY: [
      { value: 'clothing', label: 'Ropa' },
      { value: 'electronics', label: 'Electrónicos' },
      { value: 'restaurant', label: 'Restaurante' },
      { value: 'cafe', label: 'Café' }
    ],
    PAYMENT_METHODS_MASTER: [
      { value: 'cash', label: 'Efectivo' },
      { value: 'credit', label: 'Tarjeta de Crédito' },
      { value: 'debit', label: 'Tarjeta de Débito' },
      { value: 'transfer', label: 'Transferencia' },
      { value: 'paypal', label: 'PayPal' }
    ],
    SOCIAL_NETWORK_TYPES: [
      { value: 'facebook', label: 'Facebook' },
      { value: 'instagram', label: 'Instagram' },
      { value: 'twitter', label: 'Twitter / X' },
      { value: 'linkedin', label: 'LinkedIn' },
      { value: 'tiktok', label: 'TikTok' },
      { value: 'youtube', label: 'YouTube' }
    ]
  };

  private readonly subcategoryMap: Record<string, OptionItem[]> = {
    retail: [
      { value: 'groceries', label: 'Abarrotes' },
      { value: 'clothing', label: 'Ropa y Calzado' },
      { value: 'electronics', label: 'Electrónica' },
      { value: 'home', label: 'Hogar y Decoración' }
    ],
    services: [
      { value: 'consulting', label: 'Consultoría' },
      { value: 'maintenance', label: 'Mantenimiento' },
      { value: 'beauty', label: 'Belleza y Spa' },
      { value: 'transport', label: 'Transporte y Logística' }
    ],
    food: [
      { value: 'restaurant', label: 'Restaurante' },
      { value: 'cafe', label: 'Café' },
      { value: 'bakery', label: 'Panadería/Pastelería' },
      { value: 'delivery', label: 'Comida a domicilio' }
    ],
    health: [
      { value: 'clinic', label: 'Clínica' },
      { value: 'dental', label: 'Dental' },
      { value: 'lab', label: 'Laboratorio' },
      { value: 'wellness', label: 'Bienestar' }
    ],
    education: [
      { value: 'school', label: 'Escuela' },
      { value: 'courses', label: 'Cursos y Talleres' },
      { value: 'tutoring', label: 'Tutorías' },
      { value: 'language', label: 'Idiomas' }
    ]
  };

  getOptions(sourceKey?: string): OptionItem[] {
    if (!sourceKey) return [];
    return this.sources[sourceKey] ?? [];
  }

  getSubcategories(categoryValue: string): OptionItem[] {
    return this.subcategoryMap[categoryValue] ?? this.getOptions('REF_SUB_CATEGORY');
  }
}
