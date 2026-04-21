'use client';

import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';

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
    if (!map.getPane('labels')) {
      const pane = map.createPane('labels');
      pane.style.zIndex = '450';
      pane.style.pointerEvents = 'none';
    }
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
  useEffect(() => {
    if (!marker) return;
    map.flyTo([marker.lat, marker.lng], Math.max(map.getZoom(), 5.8), {
      duration: 0.8,
    });
  }, [map, marker]);
  return null;
}

function RegionLabel({ marker, selected }: { marker: UKMapMarker; selected: boolean }) {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: selected ? 'uk-region-label' : 'country-label',
        html: `<span>${marker.name}</span>`,
        iconAnchor: [0, -14],
      }),
    [marker.name, selected],
  );

  return (
    <Marker
      position={[marker.lat, marker.lng]}
      icon={icon}
      interactive={false}
      pane="labels"
    />
  );
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
          />
        );
      })}
      {markers.map((marker) => (
        <RegionLabel
          key={`label-${marker.slug}`}
          marker={marker}
          selected={marker.slug === selectedSlug}
        />
      ))}
    </MapContainer>
  );
}
