// scripts/check-handoff-contract.mjs
//
// Focused, dependency-free checks for the desktop handoff security boundary.
// Pure helper assertions cover credential shape and origin rejection. Static
// contract checks keep the public nonce out of the claim-secret role, require
// both row locks and verify the privileged RPC grants stay service-only.
//
// This does not apply the migration or contact Supabase. Database behavior is
// still verified separately when the migration reaches a local test database.
// No Oxford commas, no em dashes.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { digestClaimSecret, handler, sameOrigin, validClaimSecret, validNonce } from '../netlify/functions/handoff.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');

const sampleNonce = '6f047da0-7328-4d6c-b9b7-cc18cae1a434';
const sampleSecret = 'a'.repeat(43);

assert.equal(validNonce(sampleNonce), true);
assert.equal(validNonce('6f047da0-7328-4d6c-b9b7'), false);
assert.equal(validClaimSecret(sampleSecret), true);
assert.equal(validClaimSecret('a'.repeat(42)), false);
assert.equal(digestClaimSecret(sampleSecret).length, 64);
assert.equal(digestClaimSecret(sampleSecret), digestClaimSecret(sampleSecret));
assert.equal(sameOrigin({ headers: { origin: 'https://phosphor.neonburro.com' } }), 'https://phosphor.neonburro.com');
assert.equal(sameOrigin({ headers: { origin: 'https://example.com' } }), null);
assert.equal(sameOrigin({ headers: {} }), null);

const foreign = await handler({ httpMethod: 'POST', headers: { origin: 'https://example.com' }, body: '{}' });
assert.equal(foreign.statusCode, 403);
assert.equal(foreign.headers['Access-Control-Allow-Origin'], undefined);
assert.match(foreign.headers['Cache-Control'], /no-store/);

const options = await handler({ httpMethod: 'OPTIONS', headers: { origin: 'https://phosphor.neonburro.com' } });
assert.equal(options.statusCode, 204);
assert.equal(options.headers['Access-Control-Allow-Origin'], 'https://phosphor.neonburro.com');

const method = await handler({ httpMethod: 'GET', headers: { origin: 'https://phosphor.neonburro.com' } });
assert.equal(method.statusCode, 405);

const malformed = await handler({ httpMethod: 'POST', headers: { origin: 'https://phosphor.neonburro.com' }, body: '{' });
assert.equal(malformed.statusCode, 400);

const [endpoint, door, approve, migration] = await Promise.all([
  read('netlify/functions/handoff.js'),
  read('src/pages/Door/index.jsx'),
  read('src/pages/Approve/index.jsx'),
  read('supabase/migrations/20260927103443_secure_handoff_claims.sql'),
]);

assert.match(endpoint, /randomBytes\(32\)\.toString\('base64url'\)/);
assert.match(endpoint, /claim_secret_hash: digestClaimSecret\(claimSecret\)/);
assert.doesNotMatch(endpoint, /\.insert\([^)]*claim_secret:/s);
assert.match(endpoint, /'Cache-Control': 'no-store/);
assert.match(endpoint, /path: HANDOFF_PATH/);
assert.match(endpoint, /aggregateBy: \['ip'\]/);
assert.match(endpoint, /return answer\(403, \{ ok: false, reason: 'origin' \}/);

assert.match(door, /searchParams\.set\('n', result\.nonce\)/);
assert.doesNotMatch(door, /searchParams\.set\([^)]*claim_secret/);
assert.match(door, /action: 'claim', nonce: pending\.nonce, claim_secret: pending\.claimSecret/);
assert.match(door, /const handoff = useRef\(null\)/);
assert.doesNotMatch(door, /(?:localStorage|sessionStorage)\.[^(]+\([^)]*claim/i);
assert.match(door, /candidate\.origin !== window\.location\.origin/);
assert.match(door, /candidate\.pathname !== '\/approve\/'/);
assert.match(door, /entries\.length !== 1 \|\| entries\[0\]\[0\] !== 'n'/);
assert.match(door, /return `\/approve\/\?n=\$\{encodeURIComponent\(nonce\.toLowerCase\(\)\)\}`/);
assert.doesNotMatch(door, /(?:localStorage|sessionStorage)\.[^(]+\([^)]*return/i);

assert.match(approve, /JSON\.stringify\(\{ action: 'approve', nonce \}\)/);
assert.doesNotMatch(approve, /claim_secret/);
assert.match(approve, /const doorPath = returnPath \? `\/\?return=\$\{encodeURIComponent\(returnPath\)\}` : '\/'/);
assert.match(approve, /nav\(doorPath, \{ replace: true \}\)/);
assert.match(approve, /no, take me to my burro/);
assert.doesNotMatch(approve, /(?:localStorage|sessionStorage)\.[^(]+\([^)]*return/i);
assert.match(approve, /holder\.state === 'quiet'/);
assert.match(approve, /nothing was approved/);
assert.match(approve, /await holder\.refresh\(\)/);
assert.match(approve, /!supabase \|\| !validNonce \|\| holder\.state !== 'in'/);

const codeDerivation = "replaceAll('-', '').slice(-4).toUpperCase()";
assert.equal(door.includes(codeDerivation), true);
assert.equal(approve.includes(codeDerivation), true);
assert.match(door, /match the phone/);
assert.match(approve, /match the desktop/);

assert.equal((migration.match(/for update;/g) || []).length, 2);
assert.match(migration, /set search_path = ''/);
assert.match(migration, /where user_id = p_user_id/);
assert.match(migration, /where user_id = v_handoff\.user_id/);
assert.match(migration, /revoke all on function public\.approve_burrow_handoff\(uuid, uuid\) from public, anon, authenticated/);
assert.match(migration, /revoke all on function public\.claim_burrow_handoff\(uuid, text\) from public, anon, authenticated/);
assert.match(migration, /grant execute on function public\.approve_burrow_handoff\(uuid, uuid\) to service_role/);
assert.match(migration, /grant execute on function public\.claim_burrow_handoff\(uuid, text\) to service_role/);

console.log('handoff contract checks passed');
