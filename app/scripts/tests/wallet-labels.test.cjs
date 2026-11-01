// Wallet history labels (src/lib/wallet.ts): conversions and the rows around them.
//   npm run test:wallet-labels
const path = require('path');
const { buildSync } = require('esbuild');
// Compile the real file on the fly, like load-blogmd.cjs
const out = buildSync({ entryPoints: [path.join(__dirname, '../../src/lib/wallet.ts')], bundle: true, format: 'cjs', platform: 'node', write: false });
const m = { exports: {} };
new Function('module', 'exports', 'require', out.outputFiles[0].text)(m, m.exports, require);
const { txTitle, txDetail, usefulNote, isCredit } = m.exports;

let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + got)); if (!cond) fails++; };
const tx = (o) => ({ id: 'x', type: 'TRANSFER', status: 'COMPLETED', amount: 0, currency: 'NGN', reference: 'OGA-CONV-1', createdAt: new Date().toISOString(), ...o });

// A manual conversion, as the server writes it (wallet.service convertUsdcToNgn)
const conv = { how: 'manual', rate: 1344.28, usdc: 100, ngn: 134428 };
const usdcRow = tx({ currency: 'USDC', amount: -100, balanceBefore: 150, balanceAfter: 50, description: 'Converted 100 USDC to naira', metadata: { manualConvert: true }, convert: conv });
const ngnRow = tx({ currency: 'NGN', amount: 134428, reference: 'OGA-CONV-1-NGN', balanceBefore: 0, balanceAfter: 134428, description: 'Converted 100 USDC to ₦134,428.00 (rate: ₦1344.28/USDC)', metadata: { manualConvert: true }, convert: conv });
let s;
s = txTitle(usdcRow); ok('USDC side: "Converted to naira"', s === 'Converted to naira', s);
s = txTitle(ngnRow); ok('naira side: "Converted from USDC"', s === 'Converted from USDC', s);
s = txDetail(usdcRow); ok('detail on the USDC side: "100 USDC at ₦1,344.28"', s === '100 USDC at ₦1,344.28', s);
s = txDetail(ngnRow); ok('detail on the naira side is the same', s === '100 USDC at ₦1,344.28', s);
ok('USDC side is money out, naira side money in', !isCredit(usdcRow) && isCredit(ngnRow), `${isCredit(usdcRow)} ${isCredit(ngnRow)}`);
s = usefulNote(ngnRow); ok('the description is not repeated as a note', s === '', s);

// Automatic conversion, with USDC to 6 places
const auto = { how: 'auto', rate: 1344.2834, usdc: 12.345678, ngn: 16595.65 };
s = txTitle({ ...usdcRow, convert: auto }); ok('auto, USDC side: "Auto-converted to naira"', s === 'Auto-converted to naira', s);
s = txTitle({ ...ngnRow, convert: auto }); ok('auto, naira side: "Auto-converted from USDC"', s === 'Auto-converted from USDC', s);
s = txDetail({ ...ngnRow, convert: auto }); ok('USDC keeps its 6 places, the rate is shown to the kobo', s === '12.345678 USDC at ₦1,344.28', s);

// A broken convert field shows no detail rather than "NaN"
s = txDetail({ ...ngnRow, convert: { how: 'manual', rate: 0, usdc: 5, ngn: 0 } });
ok('a zero rate gives no detail line', s === '', s);

// Rows that are not conversions are unchanged
s = txTitle(tx({ convert: null, metadata: {} })); ok('a plain transfer is still "Transfer"', s === 'Transfer', s);
s = txTitle(tx({ convert: null, metadata: { p2p: true, counterparty: 'ada', direction: 'credit' }, description: 'Received from @ada: thanks' }));
ok('a P2P transfer still names the person', s === 'Received from @ada', s);
s = usefulNote(tx({ convert: null, metadata: { p2p: true, counterparty: 'ada', direction: 'credit' }, description: 'Received from @ada: thanks' }));
ok('a P2P note still shows', s === 'thanks', s);
s = txTitle(tx({ type: 'DEPOSIT', currency: 'USDC', convert: null })); ok('a USDC deposit is still "Added money"', s === 'Added money', s);
s = txDetail(tx({ type: 'DEPOSIT', currency: 'USDC', convert: null })); ok('...with "USDC on Solana"', s === 'USDC on Solana', s);
s = txTitle(tx({ type: 'TASK_PAYMENT', currency: 'USDC', balanceBefore: 0, balanceAfter: 5 })); ok('older answers without the field still work', s === 'Job payment', s);

console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
