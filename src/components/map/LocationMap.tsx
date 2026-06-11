import { useCallback, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import type L from 'leaflet';

interface ShotItem {
  id: string;
  project_id: string;
  project_title?: string;
  title: string;
  description: string;
  location?: string;
  status: 'planned' | 'taken' | 'approved' | 'rejected';
  latitude?: number | string | null;
  longitude?: number | string | null;
  micro_spot_name?: string;
  parking_notes?: string;
}

interface LocationMapProps {
  shots: ShotItem[];
  onSelectShot: (shot: ShotItem) => void;
}

const getMarkerColor = (status: ShotItem['status']) => {
  if (status === 'taken') return '#0f766e';
  if (status === 'approved') return '#2563eb';
  if (status === 'rejected') return '#dc2626';
  return '#5f6b76';
};

const getStatusClass = (status: ShotItem['status']) => {
  if (status === 'taken') return 'bg-[#d9eee6] text-[#0f766e]';
  if (status === 'approved') return 'bg-[#dbeafe] text-[#1d4ed8]';
  if (status === 'rejected') return 'bg-[#fee2e2] text-[#b91c1c]';
  return 'bg-[#ece7df] text-[#5f6b76]';
};

function isMappableCoordinate(lat: number, lng: number) {
  const isFinitePair = Number.isFinite(lat) && Number.isFinite(lng);
  if (!isFinitePair) return false;

  const isWithinBounds = lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  const isLikelyNullIsland = Math.abs(lat) < 0.05 && Math.abs(lng) < 0.05;
  return isWithinBounds && !isLikelyNullIsland;
}

export default function LocationMap({ shots, onSelectShot }: LocationMapProps) {
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
  const [tileProviderIndex, setTileProviderIndex] = useState(0);

  const withParsedCoordinates = useMemo(
    () =>
      shots
        .map(shot => ({
          shot,
          lat: Number(shot.latitude),
          lng: Number(shot.longitude),
        }))
        .filter(item => isMappableCoordinate(item.lat, item.lng)),
    [shots]
  );

  // Calculate map center from shots with valid coordinates
  const mapCenter = useMemo(() => {
    if (withParsedCoordinates.length === 0) {
      return [40, -95] as const; // Default to center of US
    }

    const avgLat = withParsedCoordinates.reduce((sum, item) => sum + item.lat, 0) / withParsedCoordinates.length;
    const avgLng = withParsedCoordinates.reduce((sum, item) => sum + item.lng, 0) / withParsedCoordinates.length;

    // Ensure values are valid numbers
    if (!isFinite(avgLat) || !isFinite(avgLng)) {
      return [40, -95] as const;
    }

    return [avgLat, avgLng] as const;
  }, [withParsedCoordinates]);

  const handleMarkerClick = useCallback(
    (shot: ShotItem) => {
      onSelectShot(shot);
    },
    [onSelectShot]
  );

  return (
    <MapContainer
      center={[mapCenter[0], mapCenter[1]] as L.LatLngExpression}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%' }}
      className="rounded-lg"
    >
      <TileLayer
        key={tileProviders[tileProviderIndex].url}
        url={tileProviders[tileProviderIndex].url}
        attribution={tileProviders[tileProviderIndex].attribution}
        maxZoom={20}
        eventHandlers={{
          tileerror: () => {
            setTileProviderIndex(current => {
              if (current >= tileProviders.length - 1) return current;
              return current + 1;
            });
          },
        }}
      />

      {withParsedCoordinates.map(item => (
        <CircleMarker
          key={item.shot.id}
          center={[item.lat, item.lng] as L.LatLngExpression}
          radius={8}
          pathOptions={{
            color: '#faf9f6',
            weight: 3,
            fillColor: getMarkerColor(item.shot.status),
            fillOpacity: 1,
          }}
          eventHandlers={{
            click: () => handleMarkerClick(item.shot),
          }}
        >
          <Popup>
            <div className="w-56 space-y-2 text-sm">
              <h4 className="font-semibold text-[#1f2933]">{item.shot.title}</h4>
              <p className="text-xs text-[#5f6b76]">{item.shot.project_title}</p>
              {item.shot.location && <p className="text-xs leading-5 text-[#1f2933]">{item.shot.location}</p>}
              {item.shot.micro_spot_name && (
                <p className="rounded-md bg-[#faf9f6] px-2 py-1 text-xs font-medium text-[#1f2933]">
                  {item.shot.micro_spot_name}
                </p>
              )}
              <span
                className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(item.shot.status)}`}
              >
                {item.shot.status.charAt(0).toUpperCase() + item.shot.status.slice(1)}
              </span>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
