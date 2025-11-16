export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  if (!q || q.trim().length === 0) {
    return Response.json({ error: 'Missing query' }, { status: 400 });
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
  const headers = {
    'User-Agent': 'TempleFinder/1.0 (https://agentic-473c2a9b.vercel.app)',
    'Accept': 'application/json',
  };

  try {
    const res = await fetch(url, { headers, cache: 'no-store' });
    if (!res.ok) {
      return Response.json({ error: 'Geocoding failed' }, { status: 502 });
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return Response.json({ error: 'No results' }, { status: 404 });
    }
    const place = data[0];
    return Response.json({
      lat: place.lat,
      lon: place.lon,
      display_name: place.display_name,
    });
  } catch (err) {
    return Response.json({ error: 'Upstream error' }, { status: 502 });
  }
}
