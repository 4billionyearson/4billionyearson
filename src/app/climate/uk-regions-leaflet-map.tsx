'use client';

import 'leaflet/dist/leaflet.css';

import { useEffect, useRef } from 'react';
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';

type UKMapMarker = {
  slug: string;
  name: string;
  lat: number;
  lng: number;
};

const MAP_CENTER: [number, number] = [54.8, -3.2];
const MAP_BOUNDS: [[number, number], [number, number]] = [[49.8, -8.6], [59.4, 1.9]];

function SetupPanes() {
  const map = useMap();
  useEffect(() => {
    const ttPane = map.getPane('tooltipPane');
    if (ttPane) ttPane.style.zIndex = '700';
  }, [map]);
  return null;
}

function FitUKBounds() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(MAP_BOUNDS, { padding: [12, 12] });
  }, [map]);
  return null;
}

function FocusSelectedMarker({ marker }: { marker: UKMapMarker | null }) {
  const map = useMap();
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    if (!marker) return;
    map.flyTo([marker.lat, marker.lng], Math.max(map.getZoom(), 5.8), {
      duration: 0.7,
    });
  }, [map, marker]);

  return null;
}

export default function UKRegionsLeafletMap({
  markers,
  selectedSlug,
  onSelectRegion,
}: {
  markers: UKMapMarker[];
  selectedSlug: string | null;
  onSelectRegion: (slug: string) => void;
}) {
  const selectedMarker = markers.find((m) => m.slug === selectedSlug) ?? null;

  return (
    <MapContainer
      center={MAP_CENTER}
      zoom={5.7}
      minZoom={5}
      maxZoom={8}
      maxBounds={MAP_BOUNDS}
      maxBoundsViscosity={1}
      scrollWheelZoom={true}
      className="h-[420px] md:h-[540px] w-full z-0"
      style={{ background: '#0b1020' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <SetupPanes />
      <FitUKBounds />
      <FocusSelectedMarker marker={selectedMarker} />
      {markers.map((marker) => {
        const selected = marker.slug === selectedSlug;
        return (
          <CircleMarker
            key={marker.slug}
            center={[marker.lat, marker.lng]}
            radius={selected ? 11 : 8}
            pathOptions={{
              color: selected ? '#38bdf8' : '#64748b',
              weight: selected ? 2.5 : 1.5,
              fillColor: selected ? '#0ea5e9' : '#1e293b',
              fillOpacity: selected ? 0.9 : 0.85,
            }}
            eventHandlers={{ click: () => onSelectRegion(marker.slug) }}
          >
            <Tooltip
              direction="top"
              offset={[0, -10]}
              opacity={1}
              permanent={selected}
              sticky={false}
              className={selected ? 'uk-map-tooltip uk-map-tooltip--active' : 'uk-map-tooltip'}
            >
              <span>{marker.name}</span>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

