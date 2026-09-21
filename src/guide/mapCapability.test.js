import { describe, expect, it } from 'vitest';
import { canRender3D } from './mapCapability';

const goodPhone = { hasWebGL: true, saveData: false, deviceMemory: 4, simpleMap: false };

describe('canRender3D', () => {
  it('says yes on a phone that can handle it', () => {
    expect(canRender3D(goodPhone)).toBe(true);
  });

  it('says no without WebGL', () => {
    expect(canRender3D({ ...goodPhone, hasWebGL: false })).toBe(false);
  });

  it('says no when the visitor is saving data', () => {
    expect(canRender3D({ ...goodPhone, saveData: true })).toBe(false);
  });

  it('says no on a phone with 2 GB of memory or less', () => {
    expect(canRender3D({ ...goodPhone, deviceMemory: 2 })).toBe(false);
    expect(canRender3D({ ...goodPhone, deviceMemory: 1 })).toBe(false);
    expect(canRender3D({ ...goodPhone, deviceMemory: 4 })).toBe(true);
  });

  it('says no when the visitor chose the simple map, however good the phone', () => {
    expect(canRender3D({ ...goodPhone, simpleMap: true })).toBe(false);
  });

  it('does not mind browsers that keep memory and data hints to themselves', () => {
    expect(canRender3D({ hasWebGL: true })).toBe(true);
  });

  it('says no when it knows nothing at all', () => {
    expect(canRender3D()).toBe(false);
    expect(canRender3D({})).toBe(false);
  });
});
