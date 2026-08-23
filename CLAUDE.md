# neonburro burros

The stacks at burros.neonburro.com. A room under the range for people who hold
NEONBURRO. Tyler retired the word burrow on 2026-08-23, the place is the stacks,
named for the shelves Epoch still misses. Tables and functions keep their
burrow_ prefixes, renaming a schema for a word is how records get lost. This file is the source of truth for working in this repo.
`AGENTS.md` points here.

## who we are, for whoever finds this after us

neonburro is a studio and product incubator in Ridgway, Colorado, a town of
about eleven hundred people under Courthouse and Chimney Rock. One hue•man
(Tyler) works alongside a council of nine ai burros, characters with real
jobs. Warbleur manifested all of it and is the agent in the studio's
repository. The studio is neonburro.com, the shop sells real goods, pulse runs
the business, the burroship is the floating incubator, madebutter is a bakery
that runs on our software. NEONBURRO is the community coin on Solana, a meme
backed by real work, mint EdBEwPyso39z2ow59frpuLUVz5axm61dnqAeAuxYpump. The
operations side of the token is called neode and is deliberately dull, the
plan lives at neonburro/docs/05-brand/second-asset-plan.md. We are
solutionists. We never betray the community. Epoch is the only burro who talks
about the coin and he is nonchalant about it.

## what this repo is

The holder gated room. One button on the door: the wallet signs a sentence
(Supabase Sign in with Solana), a function reads the NEONBURRO balance on
chain against a threshold stored in the database, and the door opens or quotes
the two numbers. No email, no password, no typing. Three steps on first entry:
an assigned name, a language, the wallet. Then the room, where the forum
grows, where Epoch answers questions about the coin, and where the sigil
items live when they exist, see docs/sigils.md.

## hard rules, same as the studio

- **JavaScript only.** Never TypeScript.
- **Full file rewrites only.** Never a diff or a partial snippet.
- **yarn, never npm.**
- **No Oxford commas. No em dashes and no en dashes.** Hyphens in compounds fine.
- **Trailing slashes on every route.** `/room/` not `/room`.
- **Path comment as the first line of every file**, helper block above the code
  on anything non trivial saying why it is shaped that way.
- **No inline hash comments in shell commands.**
- **Never handle secrets.** Env var names only, never values.
- **hue•man with the interpunct.** Lowercase copy, uppercase only on small mono
  kickers. Buttons lowercase. Periods over commas.
- **Teal once per screen, purple only where the chain talks.** Never lime, lime
  is the studio's. See src/theme/colors.js.
- **Never a dollar figure in visitor facing copy.** The threshold is quoted in
  NEONBURRO. No price talk, no return talk, no urgency, the same rule every
  neonburro channel runs, this is legal protection and also the voice.

## the shape

```
src/pages/Door       the sentence, the button, the one wallet link
src/pages/Hello      three steps, once. name assigned from data/handles.js
src/pages/Room       the room. empty first cut, epoch's desk
src/lib/wallet.js    detect, signInWithWeb3, the statement the wallet shows
src/lib/supabase.js  the client. remember me decides which storage
src/lib/holder.js    useHolder, the soft gate
src/data/copy.js     every visitor sentence in en ja es. add languages here
netlify/functions    holder-check (the door's brain), holder-sweep (hourly),
                     _shared (key ladder, rpc, threshold)
supabase/migrations  burrow_settings, burrow_holders, is_burrow_eligible()
docs/sigils.md       the attribute dataset design
docs/speech.md       the hold to talk plan
```

## the gate, twice

The front end gate is a courtesy (useHolder sends people to the door). The
REAL gate is row level security. Every table the room grows must carry a
policy calling `is_burrow_eligible()`. Never ship a room table without it.

## env, names only

Browser: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY. Functions: SUPABASE_URL,
SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY, SOLANA_RPC_URL (a keyed rpc,
the public node throttles the one call the door depends on). The Supabase
dashboard must have the Web3 provider (Solana) enabled with captcha on.

## before committing

`yarn build`, read the chunk table. Show git status and the diff stat. Push
only when deploying is asked for, deploys ride main through Netlify.
