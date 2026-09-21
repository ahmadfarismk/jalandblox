/**
 * The 3D city (task S13).
 *
 * KL Centre drawn in three.js from OpenStreetMap (task F14): the street grid,
 * the rivers, the parks, and the real shapes and heights of the buildings,
 * with a marker standing at each of the seven check-in spots. A marker is grey
 * until its gold stamp is earned, then gold, live, exactly like the flat map.
 *
 * The shapes themselves are built in cityLayers.js, which also holds the
 * map's colours.
 *
 * Everything comes from files in the app, so there is no tile service, no API
 * key, no bill per visitor, and it works with no signal.
 *
 * Three things keep it kind to a phone:
 * - it only draws a frame when something moves, not 60 times a second;
 * - the buildings are merged into one shape, so the phone draws them in one go;
 * - the pixel ratio is capped, so a sharp screen does not quadruple the work.
 *
 * The names are ordinary HTML buttons floating over the canvas (the same
 * MapPin as the flat map), not 3D text: they stay readable, translated, and
 * big enough to tap.
 *
 * The markers are deliberately plain for now: a pillar with a disc, not a
 * guess at what a building looks like. KrackedDev's models (task K1, spec in
 * public/models/README.md) replace them, and loading those is the next step
 * on this file once the first .glb lands.
 */
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AmbientLight,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  Group,
  Mesh,
  MeshLambertMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import city from '@/data/citymap.json';
import MapPin from './MapPin';
import { cameraDistance, sceneCentre, sceneRadius, toScene } from '../scene';
import { COLOURS, buildCity } from '../cityLayers';
import { isCollected, shortNameKey } from '../placeList';

const MARKER_GREY = 0x94a3b8;
const MARKER_GOLD = 0xf5a524;

/** A landmark marker: a pillar you can see over the rooftops, with a disc on top. */
function makeMarker() {
  const group = new Group();
  const material = new MeshLambertMaterial({ color: MARKER_GREY });
  const pillar = new Mesh(new CylinderGeometry(6, 9, 70, 12), material);
  pillar.position.y = 35;
  const disc = new Mesh(new CylinderGeometry(22, 22, 6, 18), material);
  disc.position.y = 74;
  group.add(pillar, disc);
  group.userData.material = material;
  return group;
}

export default function CityMap3D({ places, stamps, justUnlocked, position, onSelect, onFail }) {
  const { t } = useTranslation();
  const holderRef = useRef(null); // the box the canvas lives in
  const labelsRef = useRef({}); // placeId -> the floating name element
  const youRef = useRef(null);
  const sceneRef = useRef(null); // everything three.js, kept out of React state

  // Build the scene once. React state changes (a new stamp, a new position)
  // are pushed into it by the effects below, so nothing is rebuilt.
  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return undefined;

    const centre = sceneCentre(places.map((p) => p.coords));
    if (!centre) return undefined;

    const scene = new Scene();
    scene.background = null;
    const radius = Math.max(
      sceneRadius(
        places.map((p) => p.coords),
        centre,
      ),
      600,
    );
    scene.fog = new Fog(COLOURS.sky, radius * 2.2, radius * 6);

    const camera = new PerspectiveCamera(45, 1, 5, radius * 12);
    const renderer = new WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(COLOURS.sky, 1);
    holder.appendChild(renderer.domElement);
    renderer.domElement.classList.add('block', 'h-full', 'w-full', 'touch-none');

    scene.add(new AmbientLight(0xffffff, 1.6));
    const sun = new DirectionalLight(0xffffff, 1.5);
    sun.position.set(-radius, radius * 1.5, radius * 0.6);
    scene.add(sun);

    // The ground, the parks, the water, the roads and the buildings. Each
    // layer is one mesh, so the phone draws the whole city in a handful of
    // passes instead of thousands.
    const layers = buildCity(city, centre, radius);
    layers.forEach((layer) => scene.add(layer));

    // One marker per landmark, at its real position.
    const markers = {};
    for (const place of places) {
      const at = toScene(place.coords, centre);
      if (!at) continue; // coordinates still TBC
      const marker = makeMarker();
      marker.position.set(at.x, 0, at.z);
      scene.add(marker);
      markers[place.id] = marker;
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = false; // damping needs a constant redraw; a phone prefers not to
    controls.rotateSpeed = 0.5;
    controls.minDistance = radius * 0.5;
    controls.maxDistance = radius * 4;
    controls.minPolarAngle = 0.35; // never straight down
    controls.maxPolarAngle = 1.32; // never below the horizon
    controls.target.set(0, 0, 0);

    const state = { scene, camera, renderer, controls, markers, centre, radius, layers };
    sceneRef.current = state;

    /** Moves the floating names to wherever their landmark now is on screen. */
    const placeLabels = () => {
      const { clientWidth: w, clientHeight: h } = holder;
      const put = (element, worldPosition) => {
        if (!element) return;
        const screen = worldPosition.clone().project(camera);
        const visible = screen.z < 1;
        element.style.visibility = visible ? 'visible' : 'hidden';
        if (!visible) return;
        const x = ((screen.x + 1) / 2) * w;
        const y = ((1 - screen.y) / 2) * h;
        element.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
      };
      for (const [id, marker] of Object.entries(markers)) {
        put(labelsRef.current[id], new Vector3(marker.position.x, 88, marker.position.z));
      }
      if (state.you) put(youRef.current, state.you);
    };

    const draw = () => {
      renderer.render(scene, camera);
      placeLabels();
    };
    state.draw = draw;

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = holder;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // Start looking from the south, high enough to see the towers.
      // Framed on the landmarks themselves: a wider view makes the towers
      // look like grains of rice on a phone.
      const distance = cameraDistance(radius * 0.92, camera.fov, camera.aspect);
      controls.maxDistance = distance * 1.6;
      controls.minDistance = distance * 0.3;
      if (!state.framed) {
        camera.position.set(0, distance * 0.62, distance * 0.78);
        state.framed = true;
      }
      camera.updateProjectionMatrix();
      controls.update();
      draw();
    };

    const observer = new globalThis.ResizeObserver(resize);
    observer.observe(holder);
    controls.addEventListener('change', draw);
    resize();

    // A phone can take the graphics context away (low memory, app in the
    // background). Tell the Map screen so it shows the flat map instead.
    const onLost = (event) => {
      event.preventDefault();
      onFail?.(new Error('WebGL context lost'));
    };
    renderer.domElement.addEventListener('webglcontextlost', onLost);

    return () => {
      observer.disconnect();
      controls.removeEventListener('change', draw);
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      controls.dispose();
      layers.forEach((layer) => {
        layer.geometry.dispose();
        layer.material.dispose();
      });
      Object.values(markers).forEach((marker) => {
        marker.children.forEach((child) => child.geometry.dispose());
        marker.userData.material.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
    };
    // Built once: the landmarks themselves never change while the screen is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Grey to gold, without rebuilding anything.
  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;
    for (const [id, marker] of Object.entries(state.markers)) {
      marker.userData.material.color.setHex(isCollected(stamps[id]) ? MARKER_GOLD : MARKER_GREY);
    }
    state.draw?.();
  }, [stamps]);

  // Where the visitor is, as a dot in the city.
  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;
    const at = position ? toScene([position.lat, position.lng], state.centre) : null;
    state.you = at ? new Vector3(at.x, 20, at.z) : null;
    state.draw?.();
  }, [position]);

  return (
    <div className="relative aspect-[6/5] w-full overflow-hidden rounded-2xl border border-slate-200">
      <div ref={holderRef} className="absolute inset-0" />

      {/* The names float above the city. Each one is a real button, so it can
          be tapped, read out and translated like everything else. */}
      {places.map((place) => (
        <div
          key={place.id}
          ref={(element) => {
            labelsRef.current[place.id] = element;
          }}
          style={{ visibility: 'hidden' }}
          className="pointer-events-auto absolute top-0 left-0"
        >
          <MapPin
            name={t(shortNameKey(place), t(place.nameKey))}
            collected={isCollected(stamps[place.id])}
            justUnlocked={justUnlocked.includes(place.id)}
            icon={isCollected(stamps[place.id]) ? place.iconColour : place.iconGrey}
            onSelect={() => onSelect(place.id)}
          />
        </div>
      ))}

      <div ref={youRef} style={{ visibility: 'hidden' }} className="absolute top-0 left-0">
        <span className="block size-4 rounded-full border-2 border-white bg-teal-600 shadow">
          <span className="sr-only">{t('map.you', 'You are here')}</span>
        </span>
      </div>
    </div>
  );
}
