import { TestBed } from '@angular/core/testing';
import { TokenStorageService } from './token-storage.service';

describe('TokenStorageService — origin', () => {
  let service: TokenStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenStorageService);
    localStorage.clear();
  });

  it('guarda y lee el origin', () => {
    service.setOrigin('brandx');
    expect(service.getOrigin()).toBe('brandx');
  });

  it('getOrigin devuelve null si no hay nada', () => {
    expect(service.getOrigin()).toBeNull();
  });

  it('clearToken borra el origin', () => {
    service.setOrigin('brandx');
    service.clearToken();
    expect(service.getOrigin()).toBeNull();
  });
});
