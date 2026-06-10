import { useCallback, useMemo } from 'react';
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
  if (status === 'taken') return '#10B981';
  if (status === 'approved') return '#3B82F6';
  if (status === 'rejected') return '#EF4444';
  return '#6B7280';
};

export default function LocationMap({ shots, onSelectShot }: LocationMapProps) {
  const withParsedCoordinates = useMemo(
    () =>
      shots
        .map(shot => ({
          shot,
          lat: Number(shot.latitude),
          lng: Number(shot.longitude),
        }))
        .filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lng)),
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
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>"
      />

      {withParsedCoordinates.map(item => (
        <CircleMarker
          key={item.shot.id}
          center={[item.lat, item.lng] as L.LatLngExpression}
          radius={8}
          pathOptions={{
            color: '#ffffff',
            weight: 2,
            fillColor: getMarkerColor(item.shot.status),
            fillOpacity: 1,
          }}
          eventHandlers={{
            click: () => handleMarkerClick(item.shot),
          }}
        >
          <Popup>
            <div className="space-y-2 text-sm">
              <h4 className="font-semibold text-gray-900">{item.shot.title}</h4>
              <p className="text-xs text-gray-600">{item.shot.project_title}</p>
              {item.shot.location && <p className="text-xs text-gray-700">{item.shot.location}</p>}
              {item.shot.micro_spot_name && <p className="text-xs font-medium text-blue-600">🎯 {item.shot.micro_spot_name}</p>}
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  item.shot.status === 'taken'
                    ? 'bg-green-100 text-green-700'
                    : item.shot.status === 'approved'
                      ? 'bg-blue-100 text-blue-700'
                      : item.shot.status === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                }`}
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
