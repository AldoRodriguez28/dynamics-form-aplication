import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LayoutHostComponent } from './layout-host.component';
import { ThemeService } from '../theme/theme.service';

describe('LayoutHostComponent', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [LayoutHostComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(LayoutHostComponent);
    const theme = TestBed.inject(ThemeService);
    return { fixture, theme };
  }

  afterEach(() => {
    document.documentElement.removeAttribute('data-origin');
    document.documentElement.style.removeProperty('--color-primary');
    document.documentElement.style.removeProperty('--color-accent');
  });

  it('renderiza el shell default cuando layoutKey es default', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-layout="default"]')).toBeTruthy();
  });

  it('renderiza el shell de brandx cuando se aplica ese origin', () => {
    const { fixture, theme } = setup();
    theme.applyFromOrigin('brandx');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-layout="brandx"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-layout="default"]')).toBeFalsy();
  });

  it('cae al layout default cuando el layoutKey no existe en el registro', () => {
    const { fixture, theme } = setup();
    theme.active.set({ origin: 'x', layoutKey: 'no-existe', cssVars: {} });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-layout="default"]')).toBeTruthy();
  });
});
