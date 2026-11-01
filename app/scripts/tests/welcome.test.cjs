// Welcome flow helpers (src/lib/welcome.ts): the referral code/link reader,
// which steps show, and spotting the "accept the rules" refusal.
//   npm run test:welcome
const path = require('path');
const { buildSync } = require('esbuild');
// Compile the real file on the fly, like wallet-labels.test.cjs
const out = buildSync({ entryPoints: [path.join(__dirname, '../../src/lib/welcome.ts')], bundle: true, format: 'cjs', platform: 'node', write: false });
const m = { exports: {} };
new Function('module', 'exports', 'require', out.outputFiles[0].text)(m, m.exports, require);
const { parseReferralInput, welcomeSteps, needsWelcome, isRulesError } = m.exports;

let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + JSON.stringify(got))); if (!cond) fails++; };
const code = (input, want) => { const s = parseReferralInput(input); ok(`${JSON.stringify(input)} -> ${JSON.stringify(want)}`, s === want, s); };

// The code alone
code('ABCD2345', 'ABCD2345');
code('  ABCD2345  ', 'ABCD2345');
code('abcd2345', 'abcd2345'); // case is kept (the server matches codes exactly)
code('ABCD 2345', 'ABCD2345'); // a space typed inside it
code('old_code-1', 'old_code-1');

// Links, as shared from Referrals (https://ogapay.app/ref/CODE) and older ones
code('https://ogapay.app/ref/ABCD2345', 'ABCD2345');
code('ogapay.app/ref/ABCD2345', 'ABCD2345');
code('https://www.ogapay.app/ref/ABCD2345/', 'ABCD2345');
code('https://ogapay.app/ref/ABCD2345?utm_source=whatsapp', 'ABCD2345');
code('https://ogapay.app/join?ref=ABCD2345', 'ABCD2345');
code('https://ogapay.app/?ref=ABCD2345&x=1', 'ABCD2345');
code('https://ogapay.app/tasks/abc?ref=ABCD2345', 'ABCD2345');
code('OGAPAY.APP/REF/ABCD2345', 'ABCD2345'); // typed with capitals on
code('Join me on OgaPay and earn: https://ogapay.app/ref/ABCD2345 🎉', 'ABCD2345');

// Nothing usable
code('', null);
code('   ', null);
code('https://ogapay.app', null);
code('https://ogapay.app/ref/', null);
code('ogapay.app/join?ref=', null);
code('my friend Ada', null);
code('ab', null);
code('A'.repeat(41), null);
code('<script>', null);
ok('a very long code in a link is cut to 40', parseReferralInput('ogapay.app/ref/' + 'A'.repeat(60)) === 'A'.repeat(40), parseReferralInput('ogapay.app/ref/' + 'A'.repeat(60)));
ok('null and undefined give null', parseReferralInput(null) === null && parseReferralInput(undefined) === null);

// Which steps show (GET /users/me/welcome, backend welcome.service welcomeFor)
const fresh = { show: true, completedAt: null, referral: { eligible: true, reason: null, until: '2026-11-09T00:00:00Z' }, rules: { acceptedAt: null, required: true }, level1: false };
let s;
s = welcomeSteps(fresh, 'off'); ok('a new account sees all four', JSON.stringify(s) === '["invite","rules","alerts","verify"]', s);
s = welcomeSteps({ ...fresh, referral: { eligible: false, reason: 'ALREADY_REFERRED', until: null } }, 'off'); ok('a referrer already: no "Who invited you?"', JSON.stringify(s) === '["rules","alerts","verify"]', s);
s = welcomeSteps({ ...fresh, referral: { eligible: false, reason: 'TOO_OLD', until: null } }, 'off'); ok('joined over 7 days ago: no invite step', !s.includes('invite'), s);
s = welcomeSteps({ ...fresh, referral: undefined }, 'off'); ok('no referral part from the server: no invite step', !s.includes('invite'), s);
s = welcomeSteps({ ...fresh, rules: { acceptedAt: '2026-11-01T10:00:00Z', required: true } }, 'off'); ok('rules accepted: no rules step', !s.includes('rules'), s);
s = welcomeSteps({ ...fresh, rules: { acceptedAt: null, required: false } }, 'off'); ok('an older account still sees the rules once', s.includes('rules'), s);
for (const p of ['on', 'blocked', 'unsupported', 'install-first', 'unavailable', null]) {
  s = welcomeSteps(fresh, p); ok(`push "${p}": alerts step skipped`, !s.includes('alerts'), s);
}
s = welcomeSteps({ ...fresh, level1: true }, 'off'); ok('Level 1 or more: no verify step', !s.includes('verify'), s);
s = welcomeSteps({ ...fresh, level1: undefined }, 'off'); ok('no level from the server: no verify step', !s.includes('verify'), s);
s = welcomeSteps({ show: true, referral: { eligible: false }, rules: { acceptedAt: '2026-10-01' }, level1: true }, 'on');
ok('an older member with everything done: no steps', s.length === 0, s);

ok('not finished: due', needsWelcome(fresh) === true);
ok('finished or closed: not due', needsWelcome({ ...fresh, show: false, completedAt: '2026-11-02T08:00:00Z' }) === false);
ok('an admin (show false): not due', needsWelcome({ ...fresh, show: false }) === false);
ok('an older server with no answer: not due', needsWelcome(undefined) === false && needsWelcome(null) === false && needsWelcome({}) === false);

// The server's "accept the rules" refusal (welcome.service RULES_MESSAGE, 403 with errors [{ code }])
const RULES_MESSAGE = 'Please accept the OgaPay rules before you take a job. Read them, tap "Accept and continue", then try again.';
const err = (message, errors) => Object.assign(new Error(message), errors ? { errors } : {});
ok('the server refusal, with its code', isRulesError(err(RULES_MESSAGE, [{ code: 'RULES_REQUIRED' }])));
ok('the server message alone', isRulesError(err(RULES_MESSAGE)));
ok('the code alone', isRulesError(err('Something else', [{ code: 'RULES_REQUIRED' }])));
ok('"Accept the rules first" is too', isRulesError(err('Accept the rules first, then try again.')));
ok('"You have already applied" is not', !isRulesError(err('You have already applied')));
ok('a validation error list is not', !isRulesError(err('Check your code', [{ field: 'code', message: 'Required' }])));
ok('"This job is full" is not', !isRulesError(err('This job is full')));
ok('"Read the job rules" is not', !isRulesError(err('Read the job rules before sending.')));
ok('nothing is not', !isRulesError(null) && !isRulesError(undefined) && !isRulesError({}));

console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
