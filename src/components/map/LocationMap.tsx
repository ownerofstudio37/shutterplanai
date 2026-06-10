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
  latitude?: number | null;
  longitude?: number | null;
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
  // Calculate map center from shots with valid coordinates
  const mapCenter = useMemo(() => {
    const validShots = shots.filter(s => s.latitude !== null && s.latitude !== undefined && s.longitude !== null && s.longitude !== undefined);
    
    if (validShots.length === 0) {
      return [40, -95] as const; // Default to center of US
    }

    const avgLat = validShots.reduce((sum, s) => sum + (s.latitude as number), 0) / validShots.length;
    const avgLng = validShots.reduce((sum, s) => sum + (s.longitude as number), 0) / validShots.length;

    // Ensure values are valid numbers
    if (!isFinite(avgLat) || !isFinite(avgLng)) {
      return [40, -95] as const;
    }

    return [avgLat, avgLng] as const;
  }, [shots]);

  const handleMarkerClick = useCallback(
    (shot: ShotItem) => {
      onSelectShot(shot);
    },
    [onSelectShot]
  );

  // Only render markers for shots with valid coordinates
  const validShots = shots.filter(s => s.latitude !== null && s.latitude !== undefined && s.longitude !== null && s.longitude !== undefined);

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

      {validShots.map(shot => (
        <CircleMarker
          key={shot.id}
          center={[shot.latitude as number, shot.longitude as number] as L.LatLngExpression}
          radius={8}
          pathOptions={{
            color: '#ffffff',
            weight: 2,
            fillColor: getMarkerColor(shot.status),
            fillOpacity: 1,
          }}
          eventHandlers={{
            click: () => handleMarkerClick(shot),
          }}
        >
          <Popup>
            <div className="space-y-2 text-sm">
              <h4 className="font-semibold text-gray-900">{shot.title}</h4>
              <p className="text-xs text-gray-600">{shot.project_title}</p>
              {shot.location && <p className="text-xs text-gray-700">{shot.location}</p>}
              {shot.micro_spot_name && <p className="text-xs font-medium text-blue-600">🎯 {shot.micro_spot_name}</p>}
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  shot.status === 'taken'
                    ? 'bg-green-100 text-green-700'
                    : shot.status === 'approved'
                      ? 'bg-blue-100 text-blue-700'
                      : shot.status === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                }`}
              >
                {shot.status.charAt(0).toUpperCase() + shot.status.slice(1)}
              </span>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
