// Old /register links keep the invite code (src/lib/registerRedirect.ts, used by
// the /register route in App.tsx). /join?ref=CODE is the live referral link that
// LoginPage reads and saves.
//   npm run test:register-redirect
const path = require('path');
const fs = require('fs');
const { buildSync } = require('esbuild');
const out = buildSync({ entryPoints: [path.join(__dirname, '../../src/lib/registerRedirect.ts')], bundle: true, format: 'cjs', platform: 'node', write: false });
const m = { exports: {} };
new Function('module', 'exports', 'require', out.outputFiles[0].text)(m, m.exports, require);
const { registerTarget } = m.exports;

let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + JSON.stringify(got))); if (!cond) fails++; };
const to = (search, want) => { const s = registerTarget(search); ok(`/register${search} -> ${want}`, s === want, s); };

to('?ref=ABCD2345', '/join?ref=ABCD2345');
to('?referral=ABCD2345', '/join?ref=ABCD2345');
to('?ref=abcd_23-45&utm_source=whatsapp', '/join?ref=abcd_23-45');
to('?ref=ABCD2345&redirect=%2Ftasks%2Fabc', '/join?ref=ABCD2345&redirect=%2Ftasks%2Fabc');
to('?ref=AB%3Cscript%3ECD', '/join?ref=ABscriptCD'); // junk characters dropped
to('?ref=' + 'A'.repeat(60), '/join?ref=' + 'A'.repeat(40)); // capped like LoginPage
to('', '/login?mode=signup');
to('?ref=', '/login?mode=signup');
to('?ref=%3C%3E', '/login?mode=signup');

// The route really uses it, and the /join page saves ?ref= into the referral slot
const app = fs.readFileSync(path.join(__dirname, '../../src/App.tsx'), 'utf8');
ok('App.tsx /register route uses RegisterRedirect', /path="\/register" element={<RegisterRedirect \/>}/.test(app), null);
ok('App.tsx RegisterRedirect navigates to registerTarget(search)', /Navigate to={registerTarget\(search\)} replace/.test(app), null);
const login = fs.readFileSync(path.join(__dirname, '../../src/pages/LoginPage.tsx'), 'utf8');
ok("LoginPage saves params.get('ref') as ogapay_referral", /params\.get\('ref'\)/.test(login) && /ogapay_referral/.test(login), null);
ok('LoginPage opens sign-up on /join', /pathname === '\/join'/.test(login), null);

console.log(fails ? `\n${fails} FAILED` : '\nALL PASS');
process.exit(fails ? 1 : 0);
