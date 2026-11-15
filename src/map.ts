import type * as GeoJSON from 'geojson';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { assets, isMapped, regions, schemes } from './data';
import { ICON_PIXEL_RATIO, assetIcon, cpcIcon, schemeIcon, toImageData } from './icons';
import { GROUP_COLOURS, REGION_COLOURS, STAGE_CLASS, TYPE_GROUP, assetIconName, isCpc, schemeIconName, type StageClass, type TypeGroup } from './labels';
import { ASSET_KINDS } from './schema';

const BASE = import.meta.env.BASE_URL;
const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

// Used only if the vector style cannot be loaded.
const RASTER_FALLBACK: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: ['https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [{ id: 'carto', type: 'raster', source: 'carto' }],
};

async function resolveStyle(): Promise<StyleSpecification> {
  try {
    const res = await fetch(OPENFREEMAP_STYLE, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(String(res.status));
    const style = (await res.json()) as StyleSpecification;
    // No glyph server: MapLibre then draws all map labels with the local font (Arial).
    delete style.glyphs;
    return style;
  } catch {
    return RASTER_FALLBACK;
  }
}

type Bounds = [number, number, number, number];
type RegionFeature = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon, { id: string; name: string }>;

function outerRings(f: RegionFeature): GeoJSON.Position[][] {
  return f.geometry.type === 'Polygon' ? [f.geometry.coordinates[0]] : f.geometry.coordinates.map((p) => p[0]);
}

function boundsOf(f: RegionFeature): Bounds {
  const b: Bounds = [Infinity, Infinity, -Infinity, -Infinity];
  for (const ring of outerRings(f))
    for (const [x, y] of ring) {
      b[0] = Math.min(b[0], x);
      b[1] = Math.min(b[1], y);
      b[2] = Math.max(b[2], x);
      b[3] = Math.max(b[3], y);
    }
  return b;
}

/** Label position: the middle of the bounding box of the largest part. */
function labelPoint(f: RegionFeature): [number, number] {
  const largest = outerRings(f).sort((a, b) => b.length - a.length)[0];
  const xs = largest.map((p) => p[0]);
  const ys = largest.map((p) => p[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

export interface MapHandlers {
  onRegion(id: string): void;
  onScheme(id: string): void;
  onAsset(id: string): void;
}

export interface MapApi {
  selectRegion(id: string | null, animate?: boolean, refitSame?: boolean): void;
  view(): { centre: [number, number]; zoom: number; allRegionsVisible: boolean };
  selectPoint(kind: 'scheme' | 'asset' | null, id?: string): void;
  setLayer(name: 'councils' | 'assets' | 'catapults', visible: boolean): void;
  /** Limits the markers to these records. null shows everything. */
  setVisible(schemeIds: string[] | null, assetIds: string[] | null): void;
  refit(): void;
}

const colourMatch = (map: Record<string, string>, key: string) =>
  ['match', ['get', key], ...Object.entries(map).flat(), '#505a5f'] as unknown as maplibregl.ExpressionSpecification;

export async function createMap(container: HTMLElement, handlers: MapHandlers, bottomInset: () => number): Promise<MapApi> {
  const [style, regionData] = await Promise.all([
    resolveStyle(),
    fetch(`${BASE}data/regions.geojson`).then((r) => r.json() as Promise<GeoJSON.FeatureCollection>),
  ]);
  const features = regionData.features as RegionFeature[];
  const bounds = new Map(features.map((f) => [f.properties.id, boundsOf(f)]));
  const all = [...bounds.values()].reduce<Bounds>(
    (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])],
    [Infinity, Infinity, -Infinity, -Infinity],
  );
  // Padding is clamped so it can never be larger than the canvas: top plus bottom
  // stays within 60% of the height, and left plus right within 60% of the width.
  const padding = () => {
    const { clientWidth: w, clientHeight: h } = container;
    const side = Math.min(30, w * 0.3);
    const vertical = 60 + bottomInset();
    const scale = vertical > h * 0.6 ? (h * 0.6) / vertical : 1;
    return { top: 30 * scale, bottom: (30 + bottomInset()) * scale, left: side, right: side };
  };

  const map = new maplibregl.Map({
    container,
    style,
    // A safe starting view over the UK. The real fit happens after load, once
    // the container has its final size.
    center: [-3.2, 54.3],
    zoom: 4.5,
    minZoom: 4,
    maxZoom: 16,
    dragRotate: false,
    pitchWithRotate: false,
    attributionControl: false,
    localIdeographFontFamily: 'Arial, Helvetica, sans-serif',
  });
  map.touchZoomRotate.disableRotation();
  map.addControl(new maplibregl.AttributionControl({ compact: false }), 'bottom-right');
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  // Icons are drawn on demand.
  map.on('styleimagemissing', (e) => {
    const [prefix, a, b] = e.id.split('-');
    let el: HTMLCanvasElement | null = null;
    if (prefix === 's') el = schemeIcon(a as TypeGroup, b as StageClass);
    else if (e.id === 'a-cpc') el = cpcIcon();
    else if (prefix === 'a' && (ASSET_KINDS as readonly string[]).includes(a)) el = assetIcon(a as (typeof ASSET_KINDS)[number]);
    if (el && !map.hasImage(e.id)) map.addImage(e.id, toImageData(el), { pixelRatio: ICON_PIXEL_RATIO });
  });

  await new Promise<void>((resolve) => map.once('load', () => resolve()));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let selectedRegion: string | null = null;
  let pointSelected = false;
  /** Fits the selected region, or all ten. Does nothing while the map has no size. */
  const fit = (animate: boolean) => {
    if (container.clientWidth < 50 || container.clientHeight < 50) return;
    // Clear any padding left behind by an earlier camera move, so it is not counted twice.
    map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
    map.fitBounds(selectedRegion ? bounds.get(selectedRegion)! : all, {
      padding: padding(),
      maxZoom: 11.5,
      duration: animate && !reduceMotion ? 900 : 0,
    });
  };
  map.resize();
  fit(false);
  // Refit when the map changes size or the device rotates, unless something is selected.
  const refit = () => {
    map.resize();
    if (!selectedRegion && !pointSelected) fit(false);
  };
  new ResizeObserver(refit).observe(container);
  window.addEventListener('orientationchange', refit);

  const firstLabel = map.getStyle().layers.find((l) => l.type === 'symbol')?.id;
  const regionColour = colourMatch(REGION_COLOURS, 'id');
  const state = (name: string) => ['boolean', ['feature-state', name], false] as maplibregl.ExpressionSpecification;

  map.addSource('regions', { type: 'geojson', data: regionData, promoteId: 'id' });
  map.addLayer(
    {
      id: 'region-fill',
      type: 'fill',
      source: 'regions',
      paint: {
        'fill-color': regionColour,
        'fill-opacity': ['case', state('selected'), 0.07, state('hover'), 0.36, state('dim'), 0.06, 0.2],
      },
    },
    firstLabel,
  );
  map.addLayer(
    {
      id: 'region-line',
      type: 'line',
      source: 'regions',
      layout: { 'line-join': 'round' },
      paint: {
        'line-color': regionColour,
        'line-width': ['case', state('selected'), 3.5, state('hover'), 3, 2],
        'line-opacity': ['case', state('dim'), 0.45, 1],
      },
    },
    firstLabel,
  );
  map.addSource('lads', { type: 'geojson', data: `${BASE}data/lads.geojson` });
  map.addLayer(
    {
      id: 'lads-line',
      type: 'line',
      source: 'lads',
      layout: { visibility: 'none' },
      paint: { 'line-color': colourMatch(REGION_COLOURS, 'region'), 'line-width': 0.8, 'line-dasharray': [3, 2] },
    },
    firstLabel,
  );

  map.addSource('assets', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: assets.map((a) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [a.lng, a.lat] },
        properties: { id: a.id, icon: assetIconName(a), catapult: a.kind === 'catapult', order: isCpc(a) ? 2 : a.kind === 'catapult' ? 1 : 0 },
      })),
    },
  });
  map.addSource('schemes', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: schemes.filter(isMapped).map((s) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
        properties: {
          id: s.id,
          icon: schemeIconName(s),
          colour: GROUP_COLOURS[TYPE_GROUP[s.type]],
          area: s.loc_precision === 'area',
          // At-risk schemes draw last, so they are never hidden under another marker.
          order: STAGE_CLASS[s.stage] === 'risk' ? 1 : 0,
        },
      })),
    },
  });
  // Below this zoom the region labels carry the counts and markers are hidden.
  const POINT_MIN_ZOOM = 6.6;

  map.addLayer({
    id: 'scheme-halo',
    type: 'circle',
    source: 'schemes',
    minzoom: POINT_MIN_ZOOM,
    filter: ['==', ['get', 'area'], true],
    paint: { 'circle-radius': 19, 'circle-color': ['get', 'colour'], 'circle-opacity': 0.2, 'circle-stroke-color': ['get', 'colour'], 'circle-stroke-width': 1, 'circle-stroke-opacity': 0.5 },
  });
  const ring = (id: string, source: string, minzoom = 0) =>
    map.addLayer({
      id,
      type: 'circle',
      source,
      minzoom,
      filter: ['==', ['get', 'id'], ''],
      paint: { 'circle-radius': 17, 'circle-color': '#ffdd00', 'circle-opacity': 0.9, 'circle-stroke-color': '#0b0c0c', 'circle-stroke-width': 3 },
    });
  ring('asset-selected', 'assets', POINT_MIN_ZOOM);
  map.addLayer({
    id: 'asset-points',
    type: 'symbol',
    source: 'assets',
    minzoom: POINT_MIN_ZOOM,
    layout: { 'icon-image': ['get', 'icon'], 'icon-allow-overlap': true, 'symbol-sort-key': ['get', 'order'] },
  });
  ring('scheme-selected', 'schemes', POINT_MIN_ZOOM);
  map.addLayer({
    id: 'scheme-points',
    type: 'symbol',
    source: 'schemes',
    minzoom: POINT_MIN_ZOOM,
    layout: { 'icon-image': ['get', 'icon'], 'icon-allow-overlap': true, 'symbol-sort-key': ['get', 'order'] },
  });

  // Which markers show: the layer toggles combined with the list filters.
  const show = { assets: true, catapults: true };
  let visible: { schemes: string[] | null; assets: string[] | null } = { schemes: null, assets: null };
  const inList = (ids: string[] | null): maplibregl.ExpressionSpecification => (ids ? ['in', ['get', 'id'], ['literal', ids]] : true as unknown as maplibregl.ExpressionSpecification);
  const updateFilters = () => {
    const kind: maplibregl.ExpressionSpecification = ['case', ['==', ['get', 'catapult'], true], show.catapults, show.assets];
    map.setFilter('asset-points', ['all', kind, inList(visible.assets)]);
    map.setFilter('scheme-points', inList(visible.schemes) as maplibregl.FilterSpecification);
    map.setFilter('scheme-halo', ['all', ['==', ['get', 'area'], true], inList(visible.schemes)]);
  };

  // Region name labels are real buttons, so regions can be opened by keyboard.
  const names = new Map(regions.map((r) => [r.id, r.name]));
  for (const f of features) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'region-label';
    const count = schemes.filter((s) => s.region === f.properties.id && isMapped(s)).length;
    el.innerHTML = `${names.get(f.properties.id) ?? f.properties.name} <span class="count">${count}<span class="visually-hidden"> sites</span></span>`;
    el.style.setProperty('--region', REGION_COLOURS[f.properties.id]);
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      handlers.onRegion(f.properties.id);
    });
    new maplibregl.Marker({ element: el }).setLngLat(labelPoint(f)).addTo(map);
    // MapLibre labels every marker "Map marker"; the button's own text is the right name.
    el.removeAttribute('aria-label');
  }
  const toggleLabels = () => container.classList.toggle('hide-region-labels', selectedRegion != null || map.getZoom() > 7.4);
  map.on('zoom', toggleLabels);
  toggleLabels();

  // Hover and click.
  let hovered: string | null = null;
  const setHover = (id: string | null) => {
    if (hovered === id) return;
    if (hovered) map.setFeatureState({ source: 'regions', id: hovered }, { hover: false });
    hovered = id;
    if (id) map.setFeatureState({ source: 'regions', id }, { hover: true });
  };
  const pointLayers = () => ['scheme-points', 'asset-points'].filter((id) => map.getLayer(id) && map.getLayoutProperty(id, 'visibility') !== 'none');
  map.on('mousemove', (e) => {
    const point = map.queryRenderedFeatures(e.point, { layers: pointLayers() })[0];
    const region = point ? undefined : map.queryRenderedFeatures(e.point, { layers: ['region-fill'] })[0];
    setHover(region ? String(region.id) : null);
    map.getCanvas().style.cursor = point || region ? 'pointer' : '';
  });
  map.on('mouseout', () => setHover(null));
  map.on('click', (e) => {
    const point = map.queryRenderedFeatures(e.point, { layers: pointLayers() })[0];
    if (point) {
      const id = String(point.properties.id);
      if (point.layer.id === 'scheme-points') handlers.onScheme(id);
      else handlers.onAsset(id);
      return;
    }
    const region = map.queryRenderedFeatures(e.point, { layers: ['region-fill'] })[0];
    if (region) handlers.onRegion(String(region.id));
  });

  return {
    selectRegion(id, animate = true, refitSame = false) {
      // "All regions" always refits, so it recovers the view after panning away.
      if (id === selectedRegion && !refitSame) return;
      selectedRegion = id;
      toggleLabels();
      for (const key of bounds.keys())
        map.setFeatureState({ source: 'regions', id: key }, { selected: key === id, dim: id != null && key !== id });
      fit(animate);
    },
    selectPoint(kind, id) {
      map.setFilter('scheme-selected', ['==', ['get', 'id'], kind === 'scheme' ? id! : '']);
      map.setFilter('asset-selected', ['==', ['get', 'id'], kind === 'asset' ? id! : '']);
      pointSelected = Boolean(kind && id);
      if (!kind || !id) return;
      const item = kind === 'scheme' ? schemes.find((s) => s.id === id) : assets.find((a) => a.id === id);
      if (!item || (kind === 'scheme' && !isMapped(item as (typeof schemes)[number]))) return;
      const target: [number, number] = [item.lng, item.lat];
      const minZoom = item.loc_precision === 'area' ? 9.5 : 11;
      const inView = map.getBounds().contains(target) && map.getZoom() >= POINT_MIN_ZOOM + 0.4;
      if (!inView || map.getZoom() < minZoom - 2.5)
        map.easeTo({ center: target, zoom: Math.max(map.getZoom(), minZoom), padding: padding(), duration: reduceMotion ? 0 : 700 });
    },
    view() {
      const b = map.getBounds();
      return {
        centre: map.getCenter().toArray(),
        zoom: map.getZoom(),
        // True when every region's bounding box is inside the visible map.
        allRegionsVisible: [...bounds.values()].every((r) => b.contains([r[0], r[1]]) && b.contains([r[2], r[3]])),
      };
    },
    setLayer(name, visible) {
      if (name === 'councils') map.setLayoutProperty('lads-line', 'visibility', visible ? 'visible' : 'none');
      else {
        show[name] = visible;
        updateFilters();
      }
    },
    setVisible(schemeIds, assetIds) {
      visible = { schemes: schemeIds, assets: assetIds };
      updateFilters();
    },
    refit: () => {
      if (!pointSelected) fit(false);
    },
  };
}
