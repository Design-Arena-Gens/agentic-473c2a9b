function toFloat(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = toFloat(searchParams.get('lat'), null);
  const lon = toFloat(searchParams.get('lon'), null);
  const radiusKm = toFloat(searchParams.get('radiusKm'), 5);

  if (lat == null || lon == null) {
    return Response.json({ error: 'Missing lat/lon' }, { status: 400 });
  }
  const radius = Math.max(0.5, radiusKm) * 1000; // meters

  const query = `
  [out:json][timeout:25];
  (
    node["amenity"="place_of_worship"]["religion"~"^(hindu|buddhist|jain|sikh|shinto)$", i](around:${radius},${lat},${lon});
    way["amenity"="place_of_worship"]["religion"~"^(hindu|buddhist|jain|sikh|shinto)$", i](around:${radius},${lat},${lon});
    relation["amenity"="place_of_worship"]["religion"~"^(hindu|buddhist|jain|sikh|shinto)$", i](around:${radius},${lat},${lon});

    node["historic"="temple"](around:${radius},${lat},${lon});
    way["historic"="temple"](around:${radius},${lat},${lon});
    relation["historic"="temple"](around:${radius},${lat},${lon});

    node["building"="temple"](around:${radius},${lat},${lon});
    way["building"="temple"](around:${radius},${lat},${lon});
    relation["building"="temple"](around:${radius},${lat},${lon});

    node["name"~"temple", i]["amenity"="place_of_worship"](around:${radius},${lat},${lon});
    way["name"~"temple", i]["amenity"="place_of_worship"](around:${radius},${lat},${lon});
    relation["name"~"temple", i]["amenity"="place_of_worship"](around:${radius},${lat},${lon});
  );
  out center 100;
  `;

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain; charset=UTF-8',
        'User-Agent': 'TempleFinder/1.0 (https://agentic-473c2a9b.vercel.app)'
      },
      body: query,
      cache: 'no-store',
    });
    if (!res.ok) {
      return Response.json({ error: 'Overpass error' }, { status: 502 });
    }
    const data = await res.json();
    const elements = Array.isArray(data.elements) ? data.elements : [];

    const results = elements.map(el => {
      const coord = el.type === 'node' ? { lat: el.lat, lon: el.lon } : (
        el.center ? { lat: el.center.lat, lon: el.center.lon } : null
      );
      if (!coord) return null;
      return {
        id: `${el.type}/${el.id}`,
        name: el.tags?.name || el.tags?.["name:en"] || el.tags?.alt_name || 'Temple',
        lat: coord.lat,
        lon: coord.lon,
        tags: el.tags || {},
        distanceMeters: haversineMeters(lat, lon, coord.lat, coord.lon),
      };
    }).filter(Boolean);

    results.sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));

    return Response.json({ results });
  } catch (err) {
    return Response.json({ error: 'Upstream error' }, { status: 502 });
  }
}
