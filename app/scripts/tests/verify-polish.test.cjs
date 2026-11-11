// Small helpers from the verification polish (2026-11-11):
//  ver-16 src/lib/dob.ts: the date-of-birth year list and 18+ check
//  ver-14 src/lib/resendLink.ts: what "Resend link" says for each server answer
//         (auth.routes.js /auth/resend-verification), used by Settings, Account
//         and the Profile email banner
//   npm run test:verify-polish
const path = require('path');
const { buildSync } = require('esbuild');
const load = (f) => {
  const out = buildSync({ entryPoints: [path.join(__dirname, '../../src/lib', f)], bundle: true, format: 'cjs', platform: 'node', write: false });
  const m = { exports: {} };
  new Function('module', 'exports', 'require', out.outputFiles[0].text)(m, m.exports, require);
  return m.exports;
};
const { dobYears, dobIso, ageOn, dobProblem, MIN_AGE } = load('dob.ts');
const { resendOutcome, RESEND_SENT, RESEND_ALREADY } = load('resendLink.ts');

let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + JSON.stringify(got))); if (!cond) fails++; };

// ── dob ──
const now = new Date(2026, 10, 11); // 11 Nov 2026, local time
const ys = dobYears(now);
ok('years start at 2008 (18 years ago), newest first', ys[0] === 2008 && ys[1] === 2007, ys.slice(0, 3));
ok('2000 is the 9th year in the list', ys.indexOf(2000) === 8, ys.indexOf(2000));
ok('years go back to 1926 (100 years)', ys[ys.length - 1] === 1926 && ys.length === 83, [ys[ys.length - 1], ys.length]);
ok('MIN_AGE is 18 (kyc.service refuses under 18)', MIN_AGE === 18, MIN_AGE);
ok('dobIso pads', dobIso('2', '4', '1995') === '1995-04-02', dobIso('2', '4', '1995'));
ok('dobIso: 31 June does not exist', dobIso('31', '6', '2000') === '', dobIso('31', '6', '2000'));
ok('dobIso: 29 Feb 2000 exists, 29 Feb 2001 does not', dobIso('29', '2', '2000') === '2000-02-29' && dobIso('29', '2', '2001') === '', [dobIso('29', '2', '2000'), dobIso('29', '2', '2001')]);
ok('dobIso: a part missing', dobIso('', '4', '1995') === '' && dobIso('2', '', '1995') === '' && dobIso('2', '4', '') === '', null);
ok('18 today (birthday is today)', ageOn('2008-11-11', now) === 18, ageOn('2008-11-11', now));
ok('17 the day before the 18th birthday', ageOn('2008-11-12', now) === 17, ageOn('2008-11-12', now));
ok('17 with the birthday next month', ageOn('2008-12-01', now) === 17, ageOn('2008-12-01', now));
ok('dobProblem: an adult is fine', dobProblem('15', '3', '2000', now) === null, dobProblem('15', '3', '2000', now));
ok('dobProblem: 18 today is fine', dobProblem('11', '11', '2008', now) === null, dobProblem('11', '11', '2008', now));
ok('dobProblem: 17 is refused', /18 or older/.test(dobProblem('12', '11', '2008', now) || ''), dobProblem('12', '11', '2008', now));
ok('dobProblem: an impossible date', /doesn't exist/.test(dobProblem('31', '2', '2000', now) || ''), dobProblem('31', '2', '2000', now));
ok('dobProblem: a part missing', /day, month and year/.test(dobProblem('', '2', '2000', now) || ''), dobProblem('', '2', '2000', now));

// ── resend link ──
const err = (status, message) => Object.assign(new Error(message), { status });
let r = resendOutcome(null); // successResponse(res, null, 'Verification email sent') -> data null
ok('sent: "Link sent", mentions spam', r.tone === 'ok' && r.text === RESEND_SENT && /spam/.test(r.text) && !r.already, r);
r = resendOutcome({ success: true, message: 'Email already verified' }); // res.json without data
ok('already verified: says so, not "sent"', r.tone === 'info' && r.text === RESEND_ALREADY && r.already, r);
r = resendOutcome(null, err(429, 'We just sent one. Check your inbox (and spam), or try again in a minute.'));
ok('one a minute (429): the server\'s words, not an error', r.tone === 'info' && /try again in a minute/.test(r.text) && !r.already, r);
r = resendOutcome(null, err(503, "We couldn't send the email right now. Please try again later, or contact support."));
ok('provider down: the server\'s reason, as an error', r.tone === 'err' && /couldn't send the email right now/.test(r.text), r);
r = resendOutcome(null, new TypeError(''));
ok('no reason at all: a plain fallback', r.tone === 'err' && /Couldn't send the email/.test(r.text), r);
r = resendOutcome(null, err(429, ''));
ok('429 with no message: still explains the wait', r.tone === 'info' && /minute/.test(r.text), r);

console.log(fails ? `\n${fails} FAILED` : '\nALL PASS');
process.exit(fails ? 1 : 0);
