/**
 * "Save JalanKL to your home screen" hint (task F11).
 * Shown after a gold stamp, because an installed app is much less likely to
 * have its saved stamps cleared by the phone (docs/PLAN.md section 16).
 *
 * Hidden when the app is already installed, or after "Not now" on this phone.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/shared/Button';
import { canPromptInstall, isInstalled, isIos, onInstallChange, promptInstall } from './install';

const DISMISSED_KEY = 'jalankl-install-hint-dismissed';

function wasDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export default function InstallHint() {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(() => isInstalled() || wasDismissed());
  const [canPrompt, setCanPrompt] = useState(canPromptInstall);

  useEffect(
    () =>
      onInstallChange(() => {
        setCanPrompt(canPromptInstall());
        if (isInstalled()) setHidden(true);
      }),
    [],
  );

  if (hidden) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Storage blocked: it just shows again next time.
    }
    setHidden(true);
  }

  async function install() {
    if (await promptInstall()) setHidden(true);
  }

  let how;
  if (canPrompt) {
    how = (
      <Button fullWidth onClick={install}>
        {t('install.button')}
      </Button>
    );
  } else {
    how = <p className="text-sm font-medium">{t(isIos() ? 'install.ios' : 'install.other')}</p>;
  }

  return (
    <div className="space-y-3 rounded-xl border border-teal-200 bg-teal-50 p-4 text-left">
      <div className="flex items-start gap-3">
        <img src="/icons/icon-192.png" alt="" className="size-12 rounded-xl" />
        <div>
          <h3 className="font-semibold">{t('install.title')}</h3>
          <p className="text-sm text-slate-700">{t('install.body')}</p>
        </div>
      </div>
      {how}
      <Button variant="quiet" fullWidth onClick={dismiss}>
        {t('install.later')}
      </Button>
    </div>
  );
}
