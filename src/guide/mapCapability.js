/**
 * Can this phone show the 3D map? (task S12)
 *
 * The 3D scene is the nicer map, but it is not worth a hot phone, a flat
 * battery or a blank tab. When any answer below is "no", the Map tab draws the
 * flat map instead, which is the same one the app has always had.
 *
 * `canRender3D` is a plain function over plain values so it can be tested
 * without a browser. `detectMapEnv` does the browser part.
 */

/**
 * @param {object} env
 * @param {boolean} env.hasWebGL      the phone can draw 3D at all
 * @param {boolean} [env.saveData]    the visitor asked their browser to save data
 * @param {number} [env.deviceMemory] rough phone memory in GB, when the browser tells us
 * @param {boolean} [env.simpleMap]   the visitor chose the simple map in Settings
 * @returns {boolean}
 */
export function canRender3D({ hasWebGL, saveData, deviceMemory, simpleMap } = {}) {
  if (simpleMap) return false;
  if (!hasWebGL) return false;
  if (saveData) return false;
  // 2 GB or less: a low-end phone. The flat map is kinder to it.
  if (typeof deviceMemory === 'number' && deviceMemory <= 2) return false;
  return true;
}

/** True if this browser can make a WebGL canvas at all. */
function webGLWorks() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Reads what this browser will tell us. Browsers that do not support the
 * "save data" or "device memory" hints simply leave them out.
 * @param {{ simpleMap?: boolean }} [prefs]
 */
export function detectMapEnv(prefs = {}) {
  const connection = typeof navigator === 'undefined' ? undefined : navigator.connection;
  return {
    hasWebGL: typeof document !== 'undefined' && webGLWorks(),
    saveData: connection?.saveData === true,
    deviceMemory: typeof navigator === 'undefined' ? undefined : navigator.deviceMemory,
    simpleMap: prefs?.simpleMap === true,
  };
}
