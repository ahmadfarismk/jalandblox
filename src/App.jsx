import { NavLink, Navigate, Outlet, Route, Routes } from 'react-router';
import GuideHomeScreen from './guide/GuideHomeScreen';
import MapScreen from './guide/MapScreen';
import PassportScreen from './rewards/PassportScreen';

// Phase 0: only the 3 tab screens are wired up. The other screens in
// docs/PLAN.md section 4 get their routes when their tasks are built.
// TODO(F5/D2): tab labels move to src/data/locales once react-i18next is added.
const TABS = [
  { to: '/', label: 'Guide' },
  { to: '/map', label: 'Map' },
  { to: '/passport', label: 'Passport' },
];

function TabLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-white text-slate-900">
      <main className="flex-1 p-4 pb-24">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto flex max-w-md">
          {TABS.map((tab) => (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={tab.to}
                end
                className={({ isActive }) =>
                  `flex min-h-14 items-center justify-center text-sm font-medium ${
                    isActive ? 'text-teal-700' : 'text-slate-500'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<TabLayout />}>
        <Route index element={<GuideHomeScreen />} />
        <Route path="map" element={<MapScreen />} />
        <Route path="passport" element={<PassportScreen />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
