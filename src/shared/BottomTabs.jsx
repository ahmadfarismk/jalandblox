/**
 * Shared bottom tab bar (task S1, docs/PLAN.md section 4).
 *
 * The same three tabs that src/App.jsx draws today, pulled into one component
 * so every screen gets the same bar. App.jsx is Faris's file: he swaps the
 * <nav> in TabLayout for <BottomTabs /> when he is ready. Nothing breaks until
 * he does.
 *
 * Labels come from the locale files through their keys, never typed in here.
 * Each tab is 56px tall, above the 44px minimum, and the bar leaves room for
 * the phone's own bottom bar.
 *
 * @param {object} props
 * @param {{to: string, labelKey: string}[]} [props.tabs]
 * @param {boolean} [props.fixed] True (default) pins it to the bottom of the
 *   screen. False lets a page show it inline, which the S1 sample page does.
 */
import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';

const DEFAULT_TABS = [
  { to: '/', labelKey: 'ui.tabs.guide' },
  { to: '/map', labelKey: 'ui.tabs.map' },
  { to: '/passport', labelKey: 'ui.tabs.passport' },
];

export default function BottomTabs({ tabs = DEFAULT_TABS, fixed = true, className = '' }) {
  const { t } = useTranslation();

  return (
    <nav
      className={[
        fixed ? 'fixed inset-x-0 bottom-0' : 'relative',
        'border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <ul className="mx-auto flex max-w-md">
        {tabs.map((tab) => (
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
              {t(tab.labelKey)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
