// scripts/check-holder-loop.mjs
//
// This is the cheap release alarm for the holder loop. It does not pretend to
// replace database tests. It keeps the repository from losing its fail-closed
// threshold, verified wallet source, permanent assignment route, privacy line,
// honest missing-money state or provider request ceilings during an ordinary
// front end edit.
//
// The assertions name intent instead of implementation detail where possible.
// No Oxford commas, no em dashes.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const stop = (message) => {
  console.error(`holder loop check failed: ${message}`);
  process.exitCode = 1;
};
const needs = (body, pattern, message) => {
  if (!pattern.test(body)) stop(message);
};
const forbids = (body, pattern, message) => {
  if (pattern.test(body)) stop(message);
};

const shared = read('netlify/functions/_shared.js');
needs(shared, /verifiedWalletOf\s*=.*identities/s, 'wallet ownership must come from verified identities');
needs(shared, /threshold unavailable/, 'threshold database failures must fail closed');

const sweep = read('netlify/functions/holder-sweep.js');
needs(sweep, /grants unavailable/, 'a grant read failure must stop the sweep');
needs(sweep, /dependency unavailable/, 'the sweep must abort before eligibility writes when a dependency fails');

const home = read('netlify/functions/holder-home.js');
needs(home, /assign_burrow_character/, 'the server must call the canonical permanent assignment function');
needs(home, /wallet_visibility/, 'community wallet publication must stay opt in');
needs(home, /referral_links/, 'the owner account must receive an opaque service link');
forbids(home, /user_metadata/, 'editable user metadata cannot establish wallet ownership');
forbids(home, /sol_balance|usdc_balance|contact_channels/, 'the holder directory cannot expose private funds or contact channels');

const transparencyReader = read('netlify/functions/_transparency.js');
needs(transparencyReader, /value === null \|\| value === undefined \|\| value === ''/, 'missing prices must remain null');

const transparencyPage = read('src/pages/Transparency/index.jsx');
needs(transparencyPage, /not recorded/, 'missing service accounting must be labelled instead of shown as zero');
needs(transparencyPage, /accountingReady=\{Boolean\(data\?\.accountingReady\)\}/, 'agent cards must receive accounting readiness');

const transparencyFeed = read('netlify/functions/transparency-feed.js');
needs(transparencyFeed, /proof_contract_version/, 'public earnings must require the hardened receipt contract');
needs(transparencyFeed, /receipt-v2/, 'public earnings must check the receipt contract version');

const app = read('src/App.jsx');
needs(app, /path="\/burro\/"/, 'the permanent Burro profile route is missing');
needs(app, /<HolderGate\s*\/>/, 'holder routes must stay behind one shared gate');

const directory = read('src/data/serviceDirectory.js');
const serviceCount = (directory.match(/\n\s+id: '/g) || []).length;
if (serviceCount !== 9) stop(`expected 9 reviewed service doors, found ${serviceCount}`);
needs(directory, /id: 'email-signatures'[\s\S]*referral: true/, 'the custom brand kit must remain the first reviewed referral service');

for (const [file, path] of [
  ['netlify/functions/epoch.js', '/.netlify/functions/epoch'],
  ['netlify/functions/transcribe.js', '/.netlify/functions/transcribe'],
  ['netlify/functions/transparency-feed.js', '/.netlify/functions/transparency-feed'],
  ['netlify/functions/tools-health.js', '/.netlify/functions/tools-health'],
  ['netlify/functions/holder-check.js', '/.netlify/functions/holder-check'],
  ['netlify/functions/holder-home.js', '/.netlify/functions/holder-home'],
]) {
  const body = read(file);
  needs(body, new RegExp(`path: ['\"]${path.replaceAll('/', '\\/')}['\"]`), `${file} needs an explicit Netlify rate limit path`);
  needs(body, /rateLimit:\s*\{[\s\S]*windowLimit:[\s\S]*windowSize:[\s\S]*aggregateBy:/, `${file} needs a complete Netlify rate limit`);
}

if (!process.exitCode) console.log('holder loop contract passes');
