import { Link, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import GuideHomeScreen from './guide/GuideHomeScreen';
import WelcomeScreen from './guide/WelcomeScreen';
import MapScreen from './guide/MapScreen';
import PassportScreen from './rewards/PassportScreen';
import SettingsScreen from './core/SettingsScreen';
import PrivacyScreen from './core/PrivacyScreen';
import DebugLocationScreen from './core/DebugLocationScreen';
import CheckinScreen from './core/CheckinScreen';
import DebugMenuScreen from './core/DebugMenuScreen';
import ComponentsSampleScreen from './guide/ComponentsSampleScreen';
import BottomTabs from './shared/BottomTabs';

// Only built screens are wired up. The others in docs/PLAN.md section 4 get
// their routes when their tasks are done.

function TabLayout() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-dvh flex-col bg-white text-slate-900">
      <header className="flex h-14 items-center justify-end px-2">
        <Link
          to="/settings"
          aria-label={t('ui.openSettings')}
          className="flex size-11 items-center justify-center rounded-full text-xl text-slate-600"
        >
          ⚙
        </Link>
      </header>
      <main className="flex-1 px-4 pb-24">
        <Outlet />
      </main>
      <BottomTabs />
    </div>
  );
}

/** Full-screen pages with no top bar and no tabs, like the first-open Welcome screen. */
function FullScreenLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-white px-4 py-6 text-slate-900">
      <Outlet />
    </div>
  );
}

/** Screens opened on top of the tabs: no bottom bar, with a back button. */
function PageLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="flex min-h-dvh flex-col bg-white text-slate-900">
      <header className="flex h-14 items-center px-2">
        <button
          type="button"
          // Go back if we came from inside the app, otherwise go to the Guide tab
          onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))}
          className="flex min-h-11 items-center px-2 font-medium text-teal-700"
        >
          ← {t('ui.back')}
        </button>
      </header>
      <main className="flex-1 px-4 pb-8">
        <Outlet />
      </main>
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
      <Route element={<PageLayout />}>
        <Route path="settings" element={<SettingsScreen />} />
        <Route path="privacy" element={<PrivacyScreen />} />
        <Route path="checkin/:id" element={<CheckinScreen />} />
        {/* Hidden developer menu (F7): force check-in states, sample stamps, test pages. */}
        <Route path="debug" element={<DebugMenuScreen />} />
        {/* Hidden developer page for the outdoor GPS test (F6). Not linked in the app. */}
        <Route path="debug/location" element={<DebugLocationScreen />} />
        {/* Hidden page showing every shared component (S1). Not linked in the app. */}
        <Route path="debug/components" element={<ComponentsSampleScreen />} />
      </Route>
      <Route element={<FullScreenLayout />}>
        <Route path="welcome" element={<WelcomeScreen />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
