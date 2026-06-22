import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { BusinessFormComponent } from './business-form.component';
import { ThemeService } from '../theme/theme.service';
import { SACOM_THEME } from '../theme/themes/sacom.theme';
import { DEFAULT_THEME } from '../theme/themes/default.theme';

describe('BusinessFormComponent – isSacom', () => {
  function make(): BusinessFormComponent {
    TestBed.configureTestingModule({
      imports: [BusinessFormComponent],
      providers: [provideRouter([]), provideHttpClient()],
    });
    return TestBed.createComponent(BusinessFormComponent).componentInstance;
  }

  it('isSacom true con tema sacom', () => {
    const cmp = make();
    TestBed.inject(ThemeService).active.set(SACOM_THEME);
    expect(cmp.isSacom()).toBe(true);
  });

  it('isSacom false con tema default', () => {
    const cmp = make();
    TestBed.inject(ThemeService).active.set(DEFAULT_THEME);
    expect(cmp.isSacom()).toBe(false);
  });
});
