import { ActiveNavTab } from '../types/companion';

const VALID_TABS: readonly ActiveNavTab[] = ['home', 'history', 'play', 'settings'];

export function resolveTabFromPathname(pathname: string): ActiveNavTab {
  if (!pathname || typeof pathname !== 'string') return 'home';
  const cleaned = pathname.replace(/\/+$/, '').toLowerCase();
  if (!cleaned || cleaned === '/') return 'home';
  const segment = cleaned.replace(/^\/+/, '').split('/')[0];
  if ((VALID_TABS as readonly string[]).includes(segment)) {
    return segment as ActiveNavTab;
  }
  return 'home';
}

export function pathnameForTab(tab: ActiveNavTab): string {
  switch (tab) {
    case 'history':
      return '/history';
    case 'play':
      return '/play';
    case 'settings':
      return '/settings';
    case 'home':
    default:
      return '/';
  }
}
