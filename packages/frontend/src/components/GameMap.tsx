import clsx from 'clsx';
import maplibregl, { type GeoJSONSource, type Marker } from 'maplibre-gl';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Coordinates } from '../types';

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
  const [mapError, setMapError] = useState(false);

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
      zoom: 1.3,
      minZoom: 0.7,
      maxZoom: 8,
      renderWorldCopies: false,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          countries: {
            type: 'geojson',
            data: '/data/countries.geojson',
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
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    map.once('load', () => {
      try {
        map.setProjection({ type: 'globe' });
      } catch {
        // Flat world remains a complete fallback on older WebGL implementations.
      }
      setReady(true);
    });
    map.on('error', (event) => {
      if (String(event.error?.message ?? '').includes('countries')) setMapError(true);
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
    const coordinates =
      guess && answer
        ? [
            [guess.lng, guess.lat],
            [answer.lng, answer.lat],
          ]
        : [];
    source?.setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates },
    });
  }, [answer, guess, ready]);

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
    <div className={clsx('game-map-shell', className, !ready && 'is-loading')}>
      <div
        ref={containerRef}
        className="game-map"
        role="application"
        tabIndex={0}
        aria-label={ariaLabel}
        onKeyDown={handleKeyboard}
      />
      {!ready ? <div className="map-loading">Unfolding the map…</div> : null}
      {mapError ? (
        <div className="map-notice" role="status">
          Country outlines are unavailable, but you can still place a pin.
        </div>
      ) : null}
      {interactive ? (
        <div className="map-help">Tap to place · Arrow keys to nudge · Shift for 5°</div>
      ) : null}
    </div>
  );
}
