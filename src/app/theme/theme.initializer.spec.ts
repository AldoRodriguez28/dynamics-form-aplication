import { applyStoredTheme } from './theme.initializer';
import { ThemeService } from './theme.service';
import { TokenStorageService } from '../services/shared/token-storage.service';

describe('applyStoredTheme', () => {
  let theme: jasmine.SpyObj<ThemeService>;
  let storage: jasmine.SpyObj<TokenStorageService>;

  beforeEach(() => {
    theme = jasmine.createSpyObj<ThemeService>('ThemeService', ['applyFromOrigin']);
    storage = jasmine.createSpyObj<TokenStorageService>('TokenStorageService', ['getOrigin']);
  });

  it('reaplica el origin guardado', () => {
    storage.getOrigin.and.returnValue('brandx');
    applyStoredTheme(theme, storage);
    expect(theme.applyFromOrigin).toHaveBeenCalledWith('brandx');
  });

  it('aplica default (null) cuando no hay origin guardado', () => {
    storage.getOrigin.and.returnValue(null);
    applyStoredTheme(theme, storage);
    expect(theme.applyFromOrigin).toHaveBeenCalledWith(null);
  });
});
