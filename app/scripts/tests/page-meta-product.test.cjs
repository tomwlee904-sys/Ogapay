// Link previews and Google data for store products (api/page-meta.js, F9 + B10):
// the real metaFor() against a fake API (global fetch), nothing goes to the network.
//   - price on request says so in the title, never "₦0"; descriptions are plain text
//   - Product data: name, picture, offer (price + currency), stars when there are
//     reviews; no offer for price on request; a breadcrumb trail
//   - a hidden or removed product (the API answers 404) gets "noindex"; any other
//     API failure keeps the generic preview (null), so a real product is never dropped
//   npm run test:page-meta
const path = require('path');
const { pathToFileURL } = require('url');

let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + (typeof got === 'string' ? got : JSON.stringify(got)))); if (!cond) fails++; };

const answers = {};
const asked = [];
global.fetch = async (url) => {
  asked.push(String(url));
  const key = String(url).replace(/^.*\/api\/v1/, '');
  const a = answers[key];
  if (!a) return { ok: false, status: 404, json: async () => ({ success: false }) };
  if (a === 500) return { ok: false, status: 500, json: async () => ({ success: false }) };
  return { ok: true, status: 200, json: async () => ({ success: true, data: a }) };
};

const ID = '11111111-2222-4333-8444-555555555555';
const base = {
  id: ID, title: 'Logo design', description: '## What you get\n\n**3 logo ideas** and a [brand guide](https://x.y).', price: 15000, currency: 'NGN',
  seller: 'ada', official: false, rating: 4.666, reviewsCount: 3, image: 'https://cdn.example.com/logo.png', category: 'Design', stock: null, isActive: true, priceOnRequest: false,
};
const ld = (head) => {
  const m = head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  return m ? JSON.parse(m[1]) : null;
};
const title = (head) => (head.match(/<title>([^<]*)<\/title>/) || [])[1];

(async () => {
  const { metaFor } = await import(pathToFileURL(path.join(__dirname, '../../api/page-meta.js')).href);
  let head, data;

  answers[`/store/${ID}`] = base;
  head = await metaFor('product', ID);
  ok('fixed price: title has the price', title(head) === 'Logo design · ₦15,000 | OgaPay Store', title(head));
  ok('description is plain text (no ## or **)', /content="What you get 3 logo ideas and a brand guide\. Sold by @ada/.test(head) && !/content="[^"]*(##|\*\*)/.test(head), head);
  ok('search engines may index it (no noindex)', !/name="robots"/.test(head));
  data = ld(head);
  const product = Array.isArray(data) && data.find((x) => x['@type'] === 'Product');
  ok('Product data: name, url, plain description, picture', product && product.name === 'Logo design' && product.url === `https://ogapay.app/store/${ID}` && product.description.startsWith('What you get 3 logo ideas') && product.image[0] === 'https://cdn.example.com/logo.png', product);
  ok('Product data: the offer in naira, in stock, sold by the seller', product && product.offers && product.offers.price === '15000' && product.offers.priceCurrency === 'NGN' && product.offers.availability === 'https://schema.org/InStock' && product.offers.seller.name === 'ada', product && product.offers);
  ok('Product data: stars from the reviews', product && product.aggregateRating && product.aggregateRating.ratingValue === 4.7 && product.aggregateRating.reviewCount === 3, product && product.aggregateRating);
  const crumbs = Array.isArray(data) && data.find((x) => x['@type'] === 'BreadcrumbList');
  ok('breadcrumbs: OgaPay > Store > Design > Logo design', crumbs && crumbs.itemListElement.map((x) => x.name).join(' > ') === 'OgaPay > Store > Design > Logo design' && crumbs.itemListElement[3].position === 4, crumbs);
  ok('no "<" can close the script tag early', !/<\/script>[\s\S]*<\/script>/.test(head.split('application/ld+json')[1] || ''));

  answers[`/store/${ID}`] = { ...base, priceOnRequest: true, price: 0, reviewsCount: 0, rating: 0 };
  head = await metaFor('product', ID);
  ok('price on request: the title says so, never ₦0', title(head) === 'Logo design · Price on request | OgaPay Store' && !head.includes('₦0'), title(head));
  data = ld(head);
  ok('price on request: no offer, no stars', data && !data[0].offers && !data[0].aggregateRating, data && data[0]);

  answers[`/store/${ID}`] = { ...base, currency: 'GHS', price: 120.5, stock: 0 };
  head = await metaFor('product', ID);
  data = ld(head);
  ok('cedi product: GH₵ in the title, GHS offer, sold out', title(head) === 'Logo design · GH₵120.5 | OgaPay Store' && data[0].offers.priceCurrency === 'GHS' && data[0].offers.price === '120.5' && data[0].offers.availability === 'https://schema.org/SoldOut', [title(head), data[0].offers]);

  answers[`/store/${ID}`] = { ...base, currency: 'SOL', price: 0.5 };
  data = ld(await metaFor('product', ID));
  ok('a SOL price is not a currency Google knows: no offer', data && !data[0].offers, data && data[0]);

  answers[`/store/${ID}`] = { ...base, official: true, seller: 'OgaPay', image: 'https://picsum.photos/400' };
  data = ld(await metaFor('product', ID));
  ok("OgaPay's own item: sold by OgaPay, stock pictures left out", data && data[0].offers.seller['@type'] === 'Organization' && data[0].offers.seller.name === 'OgaPay' && !data[0].image, data && data[0]);

  delete answers[`/store/${ID}`];
  head = await metaFor('product', ID);
  ok('hidden or removed (404): noindex, and nothing from the product', head && /<meta name="robots" content="noindex, nofollow" \/>/.test(head) && /Product not available/.test(head) && !/ld\+json/.test(head), head);

  answers[`/store/${ID}`] = 500;
  head = await metaFor('product', ID);
  ok('an API error keeps the generic preview (no noindex)', head === null, head);

  answers[`/store/${ID}`] = { ...base, isActive: false };
  head = await metaFor('product', ID);
  ok('a draft the API still returns: noindex', head && /noindex/.test(head), head);

  asked.length = 0;
  head = await metaFor('product', 'creators');
  ok('/store/creators (caught by the product rule) gets its own page title, no API call, no noindex', /<title>Creators on OgaPay Store \| OgaPay<\/title>/.test(head) && !/noindex/.test(head) && asked.length === 0, head);

  asked.length = 0;
  head = await metaFor('product', '../tasks/"><script>');
  ok('odd ids are cleaned before asking the API', asked.every((u) => !/["<>]/.test(u) && !u.includes('..')), asked);

  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
