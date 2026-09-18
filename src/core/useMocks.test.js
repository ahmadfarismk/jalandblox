import { describe, expect, it, vi } from 'vitest';
import { MOCKABLE_PARTS, parseMockSetting } from './useMocks';

const fake = (value) => [...parseMockSetting(value)].sort();

describe('VITE_USE_MOCKS', () => {
  it('fakes everything when missing, empty or "true"', () => {
    const all = [...MOCKABLE_PARTS].sort();
    expect(fake(undefined)).toEqual(all);
    expect(fake('')).toEqual(all);
    expect(fake('true')).toEqual(all);
    expect(fake(' TRUE ')).toEqual(all);
  });

  it('fakes nothing when "false"', () => {
    expect(fake('false')).toEqual([]);
  });

  it('fakes only the parts listed', () => {
    expect(fake('api')).toEqual(['api']);
    expect(fake('location, checkin')).toEqual(['checkin', 'location']);
  });

  it('ignores unknown names, with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(fake('api,gps')).toEqual(['api']);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('gps'));
    warn.mockRestore();
  });
});
