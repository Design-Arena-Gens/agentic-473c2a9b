"use client";
import { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function MapClient({ center, markers, radiusMeters, onMoveEnd }) {
  const mapRef = useRef(null);
  const layersRef = useRef({ markers: null, circle: null });

  useEffect(() => {
    if (mapRef.current) return; // already initialized
    const map = L.map('map', { preferCanvas: true, zoomControl: true });
    map.setView(center, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    layersRef.current.markers = L.layerGroup().addTo(map);
    layersRef.current.circle = L.layerGroup().addTo(map);

    if (onMoveEnd) {
      map.on('moveend', () => {
        const c = map.getCenter();
        onMoveEnd({ lat: c.lat, lon: c.lng });
      });
    }

    mapRef.current = map;
  }, [center, onMoveEnd]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(center);
  }, [center]);

  useEffect(() => {
    if (!mapRef.current || !layersRef.current.markers) return;
    const group = layersRef.current.markers;
    group.clearLayers();

    markers.forEach((m) => {
      const marker = L.marker([m.lat, m.lon], {
        title: m.name || 'Temple',
      });
      const badge = m.tags?.religion ? `<span class="badge">${m.tags.religion}</span>` : '';
      const dist = typeof m.distanceMeters === 'number' ? `${(m.distanceMeters/1000).toFixed(2)} km` : '';
      marker.bindPopup(
        `<div><strong>${m.name || 'Temple'}</strong><br/>${badge} ${dist}</div>`
      );
      marker.addTo(group);
    });

    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lon]));
      mapRef.current.fitBounds(bounds.pad(0.2));
    }
  }, [markers]);

  useEffect(() => {
    if (!mapRef.current || !layersRef.current.circle) return;
    const circleLayer = layersRef.current.circle;
    circleLayer.clearLayers();
    if (radiusMeters && radiusMeters > 0) {
      L.circle([center[0], center[1]], { radius: radiusMeters, color: '#6c8cff', opacity: 0.6 }).addTo(circleLayer);
    }
  }, [center, radiusMeters]);

  return (
    <div id="map" />
  );
}
