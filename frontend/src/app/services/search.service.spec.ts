import { TestBed } from '@angular/core/testing';
import { SearchService } from './search.service';
import { firstValueFrom } from 'rxjs';

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SearchService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('query$ initially emits empty string', async () => {
    const q = await firstValueFrom(service.query$);
    expect(q).toBe('');
  });

  it('setQuery causes query$ to emit the new value', async () => {
    service.setQuery('brazil');
    const q = await firstValueFrom(service.query$);
    expect(q).toBe('brazil');
  });

  it('multiple setQuery calls emit latest value', async () => {
    service.setQuery('a');
    service.setQuery('b');
    service.setQuery('c');
    const q = await firstValueFrom(service.query$);
    expect(q).toBe('c');
  });
});
