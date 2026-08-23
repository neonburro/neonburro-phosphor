// src/App.jsx
//
// Three places. The door, the three steps, the room. Every route carries a
// trailing slash, same rule as every neonburro property.
//
//   /         the door. one sentence, one button, one link for the walletless
//   /hello/   the three steps after the wallet signs. a name, the wallet, the
//             verification. runs once, returns bring you straight to the room
//   /room/    the burrow. gated by useHolder, which asks holder-check.js on
//             every mount and sends a wallet under the line back to the door
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

const App = () => (
  <BrowserRouter>
    <Shell>
      <Routes>
        <Route path="/" element={<Door />} />
        <Route path="/hello/" element={<Hello />} />
        <Route path="/room/" element={<Room />} />
        <Route path="/approve/" element={<Approve />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  </BrowserRouter>
);

export default App;
