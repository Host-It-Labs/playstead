import clsx from 'clsx';
import maplibregl, { type GeoJSONSource, type Marker } from 'maplibre-gl';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Coordinates } from '../types';

type RevealState = 'idle' | 'revealing' | 'revealed';

const mapEnvironment = import.meta.env;
const selfHostedSatelliteTileUrl = '/tiles/satellite/{z}/{x}/{y}.jpg';
const developmentSatelliteTileUrl =
  'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg';
const defaultSatelliteTileUrl = mapEnvironment.DEV
  ? developmentSatelliteTileUrl
  : selfHostedSatelliteTileUrl;
const satelliteTileUrl = mapEnvironment.VITE_SATELLITE_TILE_URL?.trim() || defaultSatelliteTileUrl;

function satelliteAttribution(): string {
  const configured = mapEnvironment.VITE_SATELLITE_TILE_ATTRIBUTION?.trim();
  if (configured) return configured;
  if (satelliteTileUrl === selfHostedSatelliteTileUrl) {
    return 'Satellite imagery · self-hosted by this Playstead instance';
  }
  if (satelliteTileUrl === developmentSatelliteTileUrl) {
    return 'Sentinel-2 cloudless · EOX · modified Copernicus Sentinel data 2020';
  }

  try {
    const provider = new URL(satelliteTileUrl, 'https://playstead.invalid').hostname;
    return `Satellite imagery · ${provider}`;
  } catch {
    return 'Satellite imagery · configured provider';
  }
}

function satelliteMaxZoom(): number {
  const value = mapEnvironment.VITE_SATELLITE_TILE_MAX_ZOOM?.trim();
  const configured = value ? Number(value) : Number.NaN;
  if (Number.isFinite(configured)) {
    return Math.min(22, Math.max(8, Math.floor(configured)));
  }
  return satelliteTileUrl === developmentSatelliteTileUrl ? 14 : 19;
}

const satelliteTileMaxZoom = satelliteMaxZoom();
const revealDuration = 1_400;

type GameMapProps = {
  draft?: Coordinates | null;
  guess?: Coordinates | null;
  answer?: Coordinates | null;
  interactive?: boolean;
  onDraftChange?: (coordinates: Coordinates) => void;
  className?: string;
  ariaLabel?: string;
};

const emptyLine = {
  type: 'Feature' as const,
  properties: {},
  geometry: { type: 'LineString' as const, coordinates: [] as number[][] },
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function unwrapLongitude(longitude: number, reference: number): number {
  let unwrapped = longitude;
  while (unwrapped - reference > 180) unwrapped -= 360;
  while (unwrapped - reference < -180) unwrapped += 360;
  return unwrapped;
}

function revealLine(guess: Coordinates, answer: Coordinates, progress: number): typeof emptyLine {
  if (progress <= 0) return emptyLine;

  const targetLongitude = unwrapLongitude(answer.lng, guess.lng);
  const segmentCount = 48;
  const completedSegments = Math.max(1, Math.ceil(segmentCount * progress));
  const coordinates = Array.from({ length: completedSegments + 1 }, (_, index) => {
    const step = Math.min(progress, index / segmentCount);
    return [
      guess.lng + (targetLongitude - guess.lng) * step,
      guess.lat + (answer.lat - guess.lat) * step,
    ];
  });

  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates },
  };
}

function markerElement(kind: 'draft' | 'guess' | 'answer'): HTMLDivElement {
  const element = document.createElement('div');
  element.className = `map-marker map-marker--${kind}`;
  element.title = kind === 'answer' ? 'Answer' : kind === 'guess' ? 'Your guess' : 'Draft pin';
  element.setAttribute('aria-label', element.title);
  const dot = document.createElement('span');
  element.append(dot);
  return element;
}

function setMarker(
  map: maplibregl.Map | null,
  marker: Marker | null,
  coordinates: Coordinates | null | undefined,
  kind: 'draft' | 'guess' | 'answer',
): Marker | null {
  if (!map || !coordinates) {
    marker?.remove();
    return null;
  }
  if (marker) {
    marker.setLngLat([coordinates.lng, coordinates.lat]);
    return marker;
  }
  return new maplibregl.Marker({ element: markerElement(kind), anchor: 'bottom' })
    .setLngLat([coordinates.lng, coordinates.lat])
    .addTo(map);
}

export function GameMap({
  draft,
  guess,
  answer,
  interactive = true,
  onDraftChange,
  className,
  ariaLabel = 'Atlas Drop world map. Select a location to place your pin.',
}: GameMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const draftMarkerRef = useRef<Marker | null>(null);
  const guessMarkerRef = useRef<Marker | null>(null);
  const answerMarkerRef = useRef<Marker | null>(null);
  const onDraftChangeRef = useRef(onDraftChange);
  const interactiveRef = useRef(interactive);
  const draftRef = useRef(draft);
  const [ready, setReady] = useState(false);
  const [countryDataError, setCountryDataError] = useState(false);
  const [satelliteTileError, setSatelliteTileError] = useState(false);
  const [revealState, setRevealState] = useState<RevealState>('idle');
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    onDraftChangeRef.current = onDraftChange;
    interactiveRef.current = interactive;
    draftRef.current = draft;
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = interactive ? 'crosshair' : 'grab';
    }
  }, [draft, interactive, onDraftChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: [8, 18],
      zoom: 0.9,
      minZoom: 0.4,
      maxZoom: satelliteTileMaxZoom,
      renderWorldCopies: false,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          countries: {
            type: 'geojson',
            data: '/data/countries.geojson',
            attribution: 'Natural Earth · public domain',
          },
          satellite: {
            type: 'raster',
            tiles: [satelliteTileUrl],
            tileSize: 256,
            minzoom: 0,
            maxzoom: satelliteTileMaxZoom,
            attribution: satelliteAttribution(),
          },
          'reveal-line': {
            type: 'geojson',
            data: emptyLine,
          },
        },
        layers: [
          {
            id: 'ocean',
            type: 'background',
            paint: { 'background-color': '#8dc8d3' },
          },
          {
            id: 'countries-shadow',
            type: 'fill',
            source: 'countries',
            paint: {
              'fill-color': '#204e43',
              'fill-opacity': 0.2,
              'fill-translate': [1.5, 2],
            },
          },
          {
            id: 'countries',
            type: 'fill',
            source: 'countries',
            paint: { 'fill-color': '#d9ddad', 'fill-opacity': 1 },
          },
          {
            id: 'satellite-imagery',
            type: 'raster',
            source: 'satellite',
            paint: {
              'raster-opacity': 1,
              'raster-fade-duration': 280,
              'raster-resampling': 'linear',
            },
          },
          {
            id: 'country-borders',
            type: 'line',
            source: 'countries',
            paint: {
              'line-color': '#466b57',
              'line-width': 0.65,
              'line-opacity': 0.7,
            },
          },
          {
            id: 'reveal-line',
            type: 'line',
            source: 'reveal-line',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-color': '#fff5d6',
              'line-width': 3,
              'line-dasharray': [1, 2],
            },
          },
        ],
      },
    });
    mapRef.current = map;
    map.getCanvas().style.cursor = interactiveRef.current ? 'crosshair' : 'grab';
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(
      new maplibregl.AttributionControl({ compact: map.getContainer().clientWidth < 700 }),
      'bottom-right',
    );

    map.once('style.load', () => {
      try {
        map.setProjection({ type: 'globe' });
      } catch {
        // Flat world remains a complete fallback on older WebGL implementations.
      }
    });
    map.once('load', () => {
      setReady(true);
    });
    map.on('error', (event) => {
      const sourceId = (event as typeof event & { sourceId?: string }).sourceId;
      if (sourceId === 'satellite') setSatelliteTileError(true);
      if (sourceId === 'countries') setCountryDataError(true);
    });
    map.on('click', (event) => {
      if (!interactiveRef.current) return;
      onDraftChangeRef.current?.({ lat: event.lngLat.lat, lng: event.lngLat.lng });
    });

    return () => {
      draftMarkerRef.current = null;
      guessMarkerRef.current = null;
      answerMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    mapRef.current?.setPaintProperty(
      'satellite-imagery',
      'raster-fade-duration',
      reducedMotion ? 0 : 280,
    );
  }, [ready, reducedMotion]);

  useEffect(() => {
    draftMarkerRef.current = setMarker(
      mapRef.current,
      draftMarkerRef.current,
      interactive ? draft : null,
      'draft',
    );
  }, [draft, interactive, ready]);

  useEffect(() => {
    guessMarkerRef.current = setMarker(mapRef.current, guessMarkerRef.current, guess, 'guess');
  }, [guess, ready]);

  useEffect(() => {
    answerMarkerRef.current = setMarker(mapRef.current, answerMarkerRef.current, answer, 'answer');
  }, [answer, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource('reveal-line') as GeoJSONSource | undefined;
    let animationFrame = 0;

    guessMarkerRef.current?.getElement().classList.remove('is-reveal-origin');
    answerMarkerRef.current?.getElement().classList.remove('is-revealing', 'is-revealed');

    if (!guess || !answer) {
      source?.setData(emptyLine);
      setRevealState('idle');
      return;
    }

    const answerLongitude = unwrapLongitude(answer.lng, guess.lng);
    const west = Math.min(guess.lng, answerLongitude);
    const east = Math.max(guess.lng, answerLongitude);
    const south = Math.min(guess.lat, answer.lat);
    const north = Math.max(guess.lat, answer.lat);
    const longitudePadding = Math.max(0.01, (east - west) * 0.04);
    const latitudePadding = Math.max(0.01, (north - south) * 0.04);
    const cameraPadding = Math.max(32, Math.min(88, map.getContainer().clientWidth * 0.08));
    const duration = reducedMotion ? 0 : revealDuration;

    setRevealState(reducedMotion ? 'revealed' : 'revealing');
    guessMarkerRef.current?.getElement().classList.add('is-reveal-origin');
    answerMarkerRef.current
      ?.getElement()
      .classList.add(reducedMotion ? 'is-revealed' : 'is-revealing');

    map.fitBounds(
      [
        [west - longitudePadding, south - latitudePadding],
        [east + longitudePadding, north + latitudePadding],
      ],
      {
        padding: cameraPadding,
        maxZoom: Math.min(7, satelliteTileMaxZoom),
        duration,
        animate: !reducedMotion,
        essential: false,
      },
    );

    if (reducedMotion) {
      source?.setData(revealLine(guess, answer, 1));
      return;
    }

    source?.setData(emptyLine);
    const startedAt = performance.now();
    const drawReveal = (now: number) => {
      const rawProgress = Math.min(1, (now - startedAt) / revealDuration);
      const easedProgress = 1 - Math.pow(1 - rawProgress, 3);
      source?.setData(revealLine(guess, answer, easedProgress));

      if (rawProgress < 1) {
        animationFrame = requestAnimationFrame(drawReveal);
        return;
      }

      answerMarkerRef.current?.getElement().classList.remove('is-revealing');
      answerMarkerRef.current?.getElement().classList.add('is-revealed');
      setRevealState('revealed');
    };
    animationFrame = requestAnimationFrame(drawReveal);

    return () => cancelAnimationFrame(animationFrame);
  }, [answer, guess, ready, reducedMotion]);

  const handleKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive || !onDraftChange) return;
    const amount = event.shiftKey ? 5 : 1;
    const center = mapRef.current?.getCenter();
    const current =
      draftRef.current ?? (center ? { lat: center.lat, lng: center.lng } : { lat: 0, lng: 0 });
    const changes: Partial<Record<string, Coordinates>> = {
      ArrowUp: { ...current, lat: Math.min(85, current.lat + amount) },
      ArrowDown: { ...current, lat: Math.max(-85, current.lat - amount) },
      ArrowLeft: { ...current, lng: Math.max(-180, current.lng - amount) },
      ArrowRight: { ...current, lng: Math.min(180, current.lng + amount) },
    };
    const next = changes[event.key];
    if (!next) return;
    event.preventDefault();
    onDraftChange(next);
  };

  return (
    <div
      className={clsx(
        'game-map-shell',
        className,
        !ready && 'is-loading',
        satelliteTileError && 'is-satellite-fallback',
        revealState !== 'idle' && 'has-reveal',
        revealState === 'revealing' && 'is-revealing',
        revealState === 'revealed' && 'is-revealed',
        reducedMotion && 'is-reduced-motion',
      )}
      data-reveal-state={revealState}
    >
      <div
        ref={containerRef}
        className="game-map"
        role="application"
        tabIndex={0}
        aria-label={
          revealState === 'idle' ? ariaLabel : `${ariaLabel} Your guess and the answer are shown.`
        }
        aria-busy={!ready || revealState === 'revealing'}
        onKeyDown={handleKeyboard}
      />
      {!ready ? <div className="map-loading">Unfolding the map…</div> : null}
      {satelliteTileError || countryDataError ? (
        <div className="map-notice" role="status">
          {satelliteTileError
            ? 'Some satellite tiles are unavailable. The graphic map remains active.'
            : 'Country outlines are unavailable, but satellite imagery remains active.'}
        </div>
      ) : null}
      {interactive ? (
        <div className="map-help">Tap to place · Arrow keys to nudge · Shift for 5°</div>
      ) : null}
    </div>
  );
}
