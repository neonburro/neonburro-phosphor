// src/App.jsx
//
// The public door and approval handoff sit outside the holder gate. Inside are
// the first reveal, permanent Burro record, wallet, transparency, service hall,
// tools, room and ledger. Every route carries a trailing slash, same rule as
// every neonburro property.
//
// /                 the door. one sentence, one button, one wallet link
// /hello/           the three steps after the wallet signs
// /wallet/          the connected wallet's NEONBURRO balance and buy desk
// /transparency/    studio wallets and the separate service earnings ledger
// /services/        the service shelf, wallet-owned runs and receipts
// /tools/           the systems, public wallet roles and proposal boundaries
// /room/            the stacks, gated by useHolder
// /ledger/          epoch's week of holder and activity readings
//
// The gate is enforced twice and the front end is the soft copy. Row level
// security on burrow_holders and on every room table is the real one. A front
// end can be argued with, a policy cannot.
//
// No oxford commas, no em dashes.

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Shell from './components/ShellV2';
import Door from './pages/Door';
import Approve from './pages/Approve';
import HolderGate from './components/HolderGate';
import { HolderProvider } from './lib/holder';

const Hello = lazy(() => import('./pages/Hello/CharacterHello'));
const Burro = lazy(() => import('./pages/Burro'));
const Room = lazy(() => import('./pages/Room'));
const Wallet = lazy(() => import('./pages/Wallet'));
const Transparency = lazy(() => import('./pages/Transparency'));
const Services = lazy(() => import('./pages/Services/Loop'));
const Tools = lazy(() => import('./pages/Tools'));
const Ledger = lazy(() => import('./pages/Ledger'));

const Quiet = () => null;

const App = () => (
  <BrowserRouter>
    <HolderProvider>
      <Shell>
        <Suspense fallback={<Quiet />}>
          <Routes>
            <Route path="/" element={<Door />} />
            <Route path="/approve/" element={<Approve />} />
            <Route element={<HolderGate />}>
              <Route path="/hello/" element={<Hello />} />
              <Route path="/burro/" element={<Burro />} />
              <Route path="/profile/" element={<Navigate to="/burro/" replace />} />
              <Route path="/wallet/" element={<Wallet />} />
              <Route path="/transparency/" element={<Transparency />} />
              <Route path="/services/" element={<Services />} />
              <Route path="/tools/" element={<Tools />} />
              <Route path="/room/" element={<Room />} />
              <Route path="/ledger/" element={<Ledger />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Shell>
    </HolderProvider>
  </BrowserRouter>
);

export default App;
