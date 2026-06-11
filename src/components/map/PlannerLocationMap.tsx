'use client';

import { useMemo } from 'react';
import { CircleMarker, MapContainer, Popup, Polyline, TileLayer } from 'react-leaflet';
import type L from 'leaflet';

export interface PlannerMapLocation {
  name: string;
  displayName?: string;
  whyItWorks: string;
  venueBucket?: string;
  confidenceScore?: number;
  latitude?: number | null;
  longitude?: number | null;
}

interface PlannerLocationMapProps {
  locations: PlannerMapLocation[];
  selectedLocationName?: string | null;
  onSelectLocation: (locationName: string) => void;
}

function isMappableCoordinate(lat: number, lng: number) {
  const isFinitePair = Number.isFinite(lat) && Number.isFinite(lng);
  if (!isFinitePair) return false;

  const isWithinBounds = lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  const isLikelyNullIsland = Math.abs(lat) < 0.05 && Math.abs(lng) < 0.05;
  return isWithinBounds && !isLikelyNullIsland;
}

export default function PlannerLocationMap({
  locations,
  selectedLocationName,
  onSelectLocation,
}: PlannerLocationMapProps) {
  const tileProviders = useMemo(
    () => [
      {
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
      },
      {
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution:
          "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> &copy; <a href='https://carto.com/attributions'>CARTO</a>",
      },
    ],
    []
  );

  const mappableLocations = useMemo(
    () =>
      locations
        .map(location => ({
          location,
          lat: Number(location.latitude),
          lng: Number(location.longitude),
        }))
        .filter(item => isMappableCoordinate(item.lat, item.lng)),
    [locations]
  );

  const mapCenter = useMemo(() => {
    if (mappableLocations.length === 0) {
      return [39.5, -98.35] as const;
    }

    const avgLat = mappableLocations.reduce((sum, item) => sum + item.lat, 0) / mappableLocations.length;
    const avgLng = mappableLocations.reduce((sum, item) => sum + item.lng, 0) / mappableLocations.length;
    return [avgLat, avgLng] as const;
  }, [mappableLocations]);

  const routePoints = useMemo(
    () => mappableLocations.map(item => [item.lat, item.lng] as [number, number]),
    [mappableLocations]
  );

  if (mappableLocations.length === 0) {
    return (
      <div className="flex h-90 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 text-center text-sm text-gray-600">
        No mappable coordinates are available for the current locations yet.
      </div>
    );
  }

  return (
    <MapContainer
      center={[mapCenter[0], mapCenter[1]] as L.LatLngExpression}
      zoom={12}
      scrollWheelZoom={false}
      style={{ height: '360px', width: '100%' }}
      className="rounded-xl"
    >
      <TileLayer url={tileProviders[0].url} attribution={tileProviders[0].attribution} maxZoom={20} />

      {routePoints.length > 1 && (
        <Polyline
          positions={routePoints as L.LatLngExpression[]}
          pathOptions={{ color: '#2563EB', weight: 3, opacity: 0.65, dashArray: '8 8' }}
        />
      )}

      {mappableLocations.map((item, index) => {
        const locationName = item.location.displayName || item.location.name;
        const isSelected = selectedLocationName === locationName;

        return (
          <CircleMarker
            key={`${locationName}-${index}`}
            center={[item.lat, item.lng] as L.LatLngExpression}
            radius={isSelected ? 11 : 8}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: isSelected ? '#2563EB' : '#14B8A6',
              fillOpacity: 1,
            }}
            eventHandlers={{
              click: () => onSelectLocation(locationName),
            }}
          >
            <Popup>
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-gray-900">{locationName}</p>
                <p className="text-xs text-gray-600">Stop {index + 1} in the current review order</p>
                <p className="text-xs text-gray-700">{item.location.whyItWorks}</p>
                {typeof item.location.confidenceScore === 'number' && (
                  <p className="text-xs font-medium text-blue-700">
                    Confidence {item.location.confidenceScore.toFixed(1)}/10
                  </p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
