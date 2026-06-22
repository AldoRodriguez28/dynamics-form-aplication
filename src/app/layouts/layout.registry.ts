import { Type } from '@angular/core';
import { DefaultLayoutComponent } from './default-layout/default-layout.component';
import { BrandXLayoutComponent } from './brandx-layout/brandx-layout.component';
import { SacomLayoutComponent } from './sacom-layout/sacom-layout.component';

export const DEFAULT_LAYOUT: Type<unknown> = DefaultLayoutComponent;

export const LAYOUT_REGISTRY: Record<string, Type<unknown>> = {
  default: DefaultLayoutComponent,
  brandx: BrandXLayoutComponent,
  sacom: SacomLayoutComponent,
};
