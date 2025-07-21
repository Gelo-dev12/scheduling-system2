import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import Home from './pages/page';
import Employees from './pages/employees/page';
import Schedule from './pages/schedule/page';
import Settings from './pages/settings/page';
import Timeoff from './pages/timeoff/page';
import BranchEmployees from './pages/branch/id/employees/page';
import BranchRoles from './pages/branch/id/roles/page';
import BranchSchedule from './pages/branch/id/schedule/page';

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/timeoff" element={<Timeoff />} />
          <Route path="/branch/:id/employees" element={<BranchEmployees />} />
          <Route path="/branch/:id/roles" element={<BranchRoles />} />
          <Route path="/branch/:id/schedule" element={<BranchSchedule />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
