const fs = require('fs');

const BASE = 'https://controlexpert.com.mx';
const LIMIT = 250;
const DELAY_MS = 300;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchJSON(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'CE-Scraper/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(1000 * (i + 1));
    }
  }
}

(async () => {
  let page = 1;
  const productos = [];

  while (true) {
    const data = await fetchJSON(`${BASE}/products.json?limit=${LIMIT}&page=${page}`);
    const items = data.products || [];
    if (items.length === 0) break;

    for (const p of items) {
      const v = (p.variants && p.variants[0]) || {};
      productos.push({
        titulo: p.title,
        handle: p.handle,
        url: `${BASE}/products/${p.handle}`,
        precio: v.price ? parseFloat(v.price) : null,
        disponible: v.available !== false,
        stock: typeof v.inventory_quantity === 'number' ? v.inventory_quantity : null,
        imagen: (p.images && p.images[0] && p.images[0].src) || null,
        tipo: p.product_type || '',
        vendor: p.vendor || ''
      });
    }
    console.log(`Pagina ${page}: ${items.length} productos (total ${productos.length})`);
    if (items.length < LIMIT) break;
    page++;
    await sleep(DELAY_MS);
    if (page > 50) break; // seguridad: max 12,500 productos
  }

  const salida = { actualizadoEl: new Date().toISOString(), total: productos.length, productos };
  fs.writeFileSync('datos.json', JSON.stringify(salida, null, 2));
  console.log(`Datos guardados: ${productos.length} productos.`);
})();
