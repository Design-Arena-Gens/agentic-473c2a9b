"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
const MapClient = dynamic(() => import('./components/MapClient'), { ssr: false });

const DEFAULT_CENTER = { lat: 28.6139, lon: 77.2090 }; // New Delhi fallback

export default function Page() {
  const [query, setQuery] = useState('');
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [radiusKm, setRadiusKm] = useState(5);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const radiusMeters = useMemo(() => Math.max(0.5, Number(radiusKm)) * 1000, [radiusKm]);
  const markers = useMemo(() => results.map(r => ({
    id: r.id,
    name: r.name,
    lat: r.lat,
    lon: r.lon,
    tags: r.tags,
    distanceMeters: r.distanceMeters,
  })), [results]);

  const fetchTemples = useCallback(async (lat, lon, radiusKmLocal) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/temples?lat=${lat}&lon=${lon}&radiusKm=${radiusKmLocal}`);
      if (!res.ok) throw new Error('Temple search failed');
      const data = await res.json();
      setResults(data.results || []);
    } catch (e) {
      setError('Failed to fetch temple data');
    } finally {
      setLoading(false);
    }
  }, []);

  const doSearch = useCallback(async () => {
    setError('');
    if (query && query.trim().length > 0) {
      try {
        setLoading(true);
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
        if (!res.ok) throw new Error('Geocoding failed');
        const data = await res.json();
        const lat = Number(data.lat), lon = Number(data.lon);
        setCenter({ lat, lon });
        await fetchTemples(lat, lon, radiusKm);
      } catch (e) {
        setError('Could not find that place');
      } finally {
        setLoading(false);
      }
    } else {
      await fetchTemples(center.lat, center.lon, radiusKm);
    }
  }, [query, center.lat, center.lon, radiusKm, fetchTemples]);

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      setCenter({ lat, lon });
      await fetchTemples(lat, lon, radiusKm);
      setLoading(false);
    }, (err) => {
      setError('Location access denied');
      setLoading(false);
    }, { enableHighAccuracy: true, timeout: 10000 });
  }, [radiusKm, fetchTemples]);

  useEffect(() => {
    // Initial fetch around default center
    fetchTemples(center.lat, center.lon, radiusKm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container">
      <div className="header">
        <div className="brand">Temple Finder</div>
        <div className="small">OpenStreetMap + Overpass</div>
      </div>

      <aside className="sidebar">
        <div className="controls">
          <div className="inline">
            <input
              className="input"
              placeholder="Search place or city (e.g., Varanasi)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') doSearch(); }}
            />
            <button className="button primary" onClick={doSearch}>Search</button>
          </div>
          <div className="inline">
            <button className="button secondary" onClick={useMyLocation}>Use my location</button>
            <span className="badge">Radius</span>
          </div>
          <div className="range-row">
            <input
              type="range"
              min={1}
              max={50}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
            />
            <span>{radiusKm} km</span>
          </div>

          {loading && <div className="small">Searching temples?</div>}
          {error && <div className="small" style={{ color: '#ff92a1' }}>{error}</div>}

          <div className="results">
            {markers.length === 0 && !loading && (
              <div className="small">No temples found in this area.</div>
            )}
            {markers.map((m) => (
              <div key={m.id} className="card" onClick={() => setCenter({ lat: m.lat, lon: m.lon })}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{m.name || 'Temple'}</div>
                    <div className="small">{m.tags?.religion ? m.tags.religion : 'place of worship'}</div>
                  </div>
                  <div className="small">{typeof m.distanceMeters === 'number' ? `${(m.distanceMeters/1000).toFixed(2)} km` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="map">
        <MapClient
          center={[center.lat, center.lon]}
          markers={markers}
          radiusMeters={radiusMeters}
        />
      </main>
    </div>
  );
}
