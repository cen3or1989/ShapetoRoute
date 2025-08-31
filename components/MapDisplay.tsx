
import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, useMap, Marker, Popup } from 'react-leaflet';
import type { Map } from 'leaflet';
import type { Route } from '../types';

interface MapDisplayProps {
  center: [number, number];
  zoom: number;
  routes: Route[];
  activeRouteIndex: number | null;
}

const ChangeView: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const MapDisplay: React.FC<MapDisplayProps> = ({ center, zoom, routes, activeRouteIndex }) => {
    const mapRef = useRef<Map>(null);

    useEffect(() => {
        const map = mapRef.current;
        if (map && activeRouteIndex !== null && routes[activeRouteIndex]) {
            const activeRoute = routes[activeRouteIndex];
            if (activeRoute.path.length > 0) {
                 map.fitBounds(activeRoute.path);
            }
        }
    }, [activeRouteIndex, routes, mapRef]);

  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }} ref={mapRef}>
      <ChangeView center={center} zoom={zoom} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {routes.map((route, index) => {
        const isActive = index === activeRouteIndex;
        return (
            <Polyline
                key={index}
                positions={route.path}
                pathOptions={{ 
                    color: isActive ? '#06B6D4' : '#38BDF8', 
                    weight: isActive ? 7 : 5,
                    opacity: isActive ? 1.0 : 0.7
                }}
            />
        );
      })}
       {activeRouteIndex !== null && routes[activeRouteIndex] && routes[activeRouteIndex].path.length > 0 && (
          <>
            <Marker position={routes[activeRouteIndex].path[0]}>
                <Popup>Start of: {routes[activeRouteIndex].routeName}</Popup>
            </Marker>
            <Marker position={routes[activeRouteIndex].path[routes[activeRouteIndex].path.length - 1]}>
                 <Popup>End of: {routes[activeRouteIndex].routeName}</Popup>
            </Marker>
          </>
      )}
    </MapContainer>
  );
};

export default MapDisplay;
