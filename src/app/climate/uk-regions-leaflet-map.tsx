'use client';

import 'leaflet/dist/leaflet.css';

import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';

type UKMapMarker = {
  slug: string;
  name: string;
  lat: number;
  lng: number;
};

const MAP_CENTER: [number, number] = [54.8, -3.2];
const MAP_BOUNDS: [[number, number], [number, number]] = [[49.8, -8.6], [59.4, 1.9]];

function FitUKBounds() {
  const map = useMap();

  useEffect(() => {
    map.fitBounds(MAP_BOUNDS, { padding: [12, 12] });
  }, [map]);

  return null;
}

function FocusSelectedMarker({ marker }: { marker: UKMapMarker | null }) {
  const map = useMap();

  useEffect(() => {
    if (!marker) return;
    map.flyTo([marker.lat, marker.lng], Math.max(map.getZoom(), 5.8), {
      duration: 0.8,
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
  const selectedMarker = useMemo(
    () => markers.find((marker) => marker.slug === selectedSlug) ?? null,
    [markers, selectedSlug],
  );

  return (
    <div className="overflow-hidden rounded-[28px] border border-gray-800 bg-[#070b16]">
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
        <FitUKBounds />
        <FocusSelectedMarker marker={selectedMarker} />
        {markers.map((marker) => {
          const selected = marker.slug === selectedSlug;
          return (
            <CircleMarker
              key={marker.slug}
              center={[marker.lat, marker.lng]}
              radius={selected ? 12 : 9}
              pathOptions={{
                color: selected ? '#FFF5E7' : '#D0A65E',
                weight: selected ? 3 : 2,
                fillColor: selected ? '#D0A65E' : '#111827',
                fillOpacity: selected ? 0.95 : 0.88,
              }}
              eventHandlers={{ click: () => onSelectRegion(marker.slug) }}
            >
              <Tooltip
                direction="top"
                offset={[0, -10]}
                opacity={1}
                permanent={selected}
                className="country-label"
              >
                <span>{marker.name}</span>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}