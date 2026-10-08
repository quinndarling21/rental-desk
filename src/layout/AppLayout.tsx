import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { StaffInitials } from '../components/StaffInitials';
import { isLocation, LOCATIONS } from '../lib/locations';
import { staff, staffAt } from '../lib/staff';
import { useCounter } from './CounterContext';

export function AppLayout() {
  const { location, signedIn, setLocation, setSignedIn } = useCounter();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="app">
      <header className="top-bar">
        <div className="top-bar__brand">
          <span className="wordmark">Northstar</span>
          <span className="top-bar__app">Rental Desk</span>
        </div>

        <nav className="top-bar__nav" aria-label="Main">
          <NavLink to="/agreements">Agreements</NavLink>
          <NavLink to="/checkout">Check out</NavLink>
        </nav>

        <div className="top-bar__counter">
          <label className="top-bar__field">
            <span>Location</span>
            <select
              value={location}
              onChange={(event) => {
                if (isLocation(event.target.value)) setLocation(event.target.value);
              }}
            >
              {LOCATIONS.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>

          <label className="top-bar__field">
            <span>Signed in</span>
            <select value={signedIn.id} onChange={(event) => setSignedIn(event.target.value)}>
              {staffAt(staff, location).map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>

          <StaffInitials initials={signedIn.initials} />
        </div>
      </header>

      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
