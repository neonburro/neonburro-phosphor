// src/App.jsx
//
// Seven places. The door, the three steps, the wallet, the service hall, the
// tools, the room and the ledger. Every route carries a trailing slash, same
// rule as every neonburro property.
//
// /            the door. one sentence, one button, one link for the walletless
// /hello/      the three steps after the wallet signs
// /wallet/     the connected wallet's own chain balances
// /services/   the service shelf, wallet-owned runs and receipts
// /tools/      the systems, public wallet roles and proposal boundaries
// /room/       the stacks, gated by useHolder
// /ledger/     epoch's week of holder and activity readings
//
// The gate is enforced twice and the front end is the soft copy. Row level
// security on burrow_holders and on every room table is the real one. A front
// end can be argued with, a policy cannot.
//
// No oxford commas, no em dashes.

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Shell from './components/Shell';
import Door from './pages/Door';
import Hello from './pages/Hello';
import Room from './pages/Room';
import Approve from './pages/Approve';
import Wallet from './pages/Wallet';
import Services from './pages/Services';
import Tools from './pages/Tools';
import Ledger from './pages/Ledger';

const App = () => (
  <BrowserRouter>
    <Shell>
      <Routes>
        <Route path="/" element={<Door />} />
        <Route path="/hello/" element={<Hello />} />
        <Route path="/wallet/" element={<Wallet />} />
        <Route path="/services/" element={<Services />} />
        <Route path="/tools/" element={<Tools />} />
        <Route path="/room/" element={<Room />} />
        <Route path="/ledger/" element={<Ledger />} />
        <Route path="/approve/" element={<Approve />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  </BrowserRouter>
);

export default App;
