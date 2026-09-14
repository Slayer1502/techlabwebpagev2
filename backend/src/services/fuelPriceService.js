const https = require('https');
const http = require('http');

const cache = { petrol: null, diesel: null, lastFetch: 0 };
const CACHE_TTL = 24 * 60 * 60 * 1000;

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchPage(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function extractPrice(html) {
  const m = html.match(/Rs\.\s*([\d,]+\.?\d*)\s*\/?\s*Ltr/i)
    || html.match(/₹\s*([\d,]+\.?\d*)\s*\/\s*Ltr/i)
    || html.match(/₹([\d,]+\.?\d*)/);
  if (m) return parseFloat(m[1].replace(/,/g, ''));
  return null;
}

async function getFuelPrices(city) {
  const now = Date.now();
  if (cache.petrol && cache.diesel && (now - cache.lastFetch) < CACHE_TTL) {
    return { petrol: cache.petrol, diesel: cache.diesel, cached: true };
  }

  const slug = (city || 'karur').toLowerCase().replace(/\s+/g, '-');
  const baseUrl = 'https://www.goodreturns.in';

  try {
    const [petrolHtml, dieselHtml] = await Promise.all([
      fetchPage(`${baseUrl}/petrol-price-in-${slug}.html`),
      fetchPage(`${baseUrl}/diesel-price-in-${slug}.html`)
    ]);

    const petrol = extractPrice(petrolHtml);
    const diesel = extractPrice(dieselHtml);

    if (petrol) cache.petrol = { pricePerLitre: petrol, city, fuel: 'Petrol', date: new Date().toISOString().slice(0, 10) };
    if (diesel) cache.diesel = { pricePerLitre: diesel, city, fuel: 'Diesel', date: new Date().toISOString().slice(0, 10) };
    cache.lastFetch = now;

    return { petrol: cache.petrol, diesel: cache.diesel, cached: false };
  } catch (err) {
    console.error('Fuel price fetch error:', err.message);
    return { petrol: cache.petrol, diesel: cache.diesel, cached: !!cache.petrol, error: err.message };
  }
}

module.exports = { getFuelPrices };
