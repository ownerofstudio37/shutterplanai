import { useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

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

// Create custom icons for different statuses
const getMarkerIcon = (status: string) => {
  const iconColors: Record<string, string> = {
    planned: '#6B7280', // gray
    taken: '#10B981', // green
    approved: '#3B82F6', // blue
    rejected: '#EF4444', // red
  };

  const color = iconColors[status] || '#6B7280';

  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${encodeURIComponent(color)}">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
      </svg>`
    ).toString('base64')}`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
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
        <Marker
          key={shot.id}
          position={[shot.latitude as number, shot.longitude as number] as L.LatLngExpression}
          icon={getMarkerIcon(shot.status)}
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
        </Marker>
      ))}
    </MapContainer>
  );
}
