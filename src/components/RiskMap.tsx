import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import type { SupplyChainResponse } from '../types';

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
  coordinates: [number, number];
  risk: number;
  label: string;
  country: string;
  leadTimeWeeks?: number;
  overallScore?: number;
  riskLevel?: string;
}

const COUNTRY_COORDS: Record<string, [number, number]> = {
  Taiwan: [23.6978, 120.9605],
  'South Korea': [36.5, 127.75],
  'United States': [39.8283, -98.5795],
  China: [35.8617, 104.1954],
  Israel: [31.0461, 34.8516],
  Singapore: [1.3521, 103.8198],
  Germany: [51.1657, 10.4515],
  India: [20.5937, 78.9629],
};

const riskScoreFromLevel = (level?: string) => {
  switch (level) {
    case 'LOW':
      return 0.2;
    case 'MEDIUM':
      return 0.5;
    case 'HIGH':
      return 0.75;
    case 'CRITICAL':
      return 0.95;
    default:
      return 0.4;
  }
};

interface Props {
  data: SupplyChainResponse;
}

export const RiskMap: React.FC<Props> = ({ data }) => {
  const geoByCountry = new Map(data.geopolitical_risks.map((item) => [item.region, item]));
  const points: RiskPoint[] = data.fab_recommendations
    .map((fab) => {
      const geo = geoByCountry.get(fab.country);
      const coordinates = COUNTRY_COORDS[fab.country];
      if (!coordinates) return null;
      return {
        coordinates,
        risk: 1 - fab.risk_score / 100,
        label: fab.name,
        country: fab.country,
        leadTimeWeeks: fab.lead_time_weeks,
        overallScore: fab.overall_score,
        riskLevel: geo?.risk_level,
      };
    })
    .filter((point): point is RiskPoint => point !== null);

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
        
        {points.map((point, idx) => (
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
                <p className="text-zinc-400">{point.country}</p>
                <p className="text-zinc-400">Risk Factor: {(point.risk * 100).toFixed(0)}%</p>
                {point.overallScore !== undefined && <p className="text-zinc-400">Fab Score: {point.overallScore}/100</p>}
                {point.leadTimeWeeks !== undefined && <p className="text-zinc-400">Lead Time: {point.leadTimeWeeks} weeks</p>}
                {point.riskLevel && <p className="text-zinc-400">Geo Risk: {point.riskLevel}</p>}
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
        {data.geopolitical_risks
          .filter((risk) => !points.some((point) => point.country === risk.region) && COUNTRY_COORDS[risk.region])
          .map((risk, idx) => (
            <CircleMarker
              key={`geo-${idx}`}
              center={COUNTRY_COORDS[risk.region]}
              radius={8 + riskScoreFromLevel(risk.risk_level) * 12}
              pathOptions={{
                fillColor: risk.risk_level === 'CRITICAL' || risk.risk_level === 'HIGH' ? '#ef4444' : risk.risk_level === 'MEDIUM' ? '#f59e0b' : '#3b82f6',
                color: 'white',
                weight: 1,
                opacity: 0.7,
                fillOpacity: 0.35
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
                <div className="bg-zinc-900 text-white p-2 rounded border border-zinc-700 text-[10px] font-mono">
                  <p className="font-bold">{risk.region}</p>
                  <p className="text-zinc-400">Geo Risk: {risk.risk_level}</p>
                </div>
              </Tooltip>
            </CircleMarker>
          ))}
      </MapContainer>
    </div>
  );
};
