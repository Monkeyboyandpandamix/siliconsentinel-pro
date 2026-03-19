import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, ZoomControl } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface RiskPoint {
  coordinates: [number, number]; // [lat, lng]
  risk: number; // 0 to 1
  label: string;
}

// Mock risk data for suppliers
const MOCK_RISK_DATA: RiskPoint[] = [
  { coordinates: [25.0330, 121.5654], risk: 0.8, label: 'Taiwan (High Concentration)' },
  { coordinates: [37.5665, 126.9780], risk: 0.4, label: 'South Korea' },
  { coordinates: [22.3193, 114.1772], risk: 0.7, label: 'Shenzhen (Supply Chain Hub)' },
  { coordinates: [37.3382, -121.8863], risk: 0.2, label: 'Silicon Valley' },
  { coordinates: [1.3521, 103.8198], risk: 0.3, label: 'Singapore' },
  { coordinates: [12.9716, 77.5946], risk: 0.5, label: 'Bangalore' },
  { coordinates: [52.5200, 13.4050], risk: 0.3, label: 'Berlin' },
];

export const RiskMap: React.FC = () => {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 h-[500px] relative overflow-hidden">
      <div className="absolute top-8 left-8 z-[1000] bg-zinc-950/80 backdrop-blur border border-zinc-800 p-3 rounded-lg shadow-2xl pointer-events-none">
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-2">Risk Legend (OpenStreetMap)</h3>
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-[10px] text-zinc-300">High Risk / Concentration</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-[10px] text-zinc-300">Moderate Risk</span>
            </div>
        </div>
      </div>
      
      <MapContainer 
        center={[20, 0]} 
        zoom={2} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <ZoomControl position="bottomright" />
        
        {MOCK_RISK_DATA.map((point, idx) => (
          <CircleMarker 
            key={idx}
            center={point.coordinates}
            radius={10 + (point.risk * 15)}
            pathOptions={{
              fillColor: point.risk > 0.6 ? '#ef4444' : point.risk > 0.3 ? '#f59e0b' : '#3b82f6',
              color: 'white',
              weight: 1,
              opacity: 0.8,
              fillOpacity: 0.6
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
              <div className="bg-zinc-900 text-white p-2 rounded border border-zinc-700 text-[10px] font-mono">
                <p className="font-bold">{point.label}</p>
                <p className="text-zinc-400">Risk Factor: {(point.risk * 100).toFixed(0)}%</p>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
};
