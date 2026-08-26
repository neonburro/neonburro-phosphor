# phosphor.

The holders room at [phosphor.neonburro.com](https://phosphor.neonburro.com).
Hold enough NEONBURRO and the door knows you. A wallet signature opens it,
a balance the database checks on chain keeps it honest, and inside are the
stacks, the rooms where the herd talks, with epoch. at his desk in the coin
room. Wallet first, like a good pocket, strictly non custodial, phosphor
never creates or holds a wallet for anybody.

Built by neonburro in Ridgway, Colorado. `CLAUDE.md` is the real
documentation, read it before touching anything.

## Running it

```
yarn
yarn dev
```

The door renders without env. The signature needs the Supabase Web3 provider
enabled on the shared project, and the balance check needs a keyed Solana rpc
in `SOLANA_RPC_URL`. The threshold is a live row in `burrow_settings`, edited
from Pulse, nothing redeploys.

## The short laws

JavaScript only, never TypeScript. yarn, never npm. Three accents with one
job each, lime for the family, teal for money, purple for the chain. A
burro's name renders lowercase with a period, epoch. not Epoch, and there is
never a w after burro in anything a visitor reads. The db prefixes keep their
old spelling on purpose, renaming a schema for a word is how records get
lost.
