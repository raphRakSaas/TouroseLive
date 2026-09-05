import {
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private menuTrigger: HTMLElement | null = null;

  protected readonly menuOpen = signal(false);

  protected readonly isPlainShell = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => this.isPlainShellUrl(event.urlAfterRedirects)),
      startWith(this.isPlainShellUrl(this.router.url)),
    ),
    { initialValue: this.isPlainShellUrl(this.router.url) },
  );

  protected readonly categories = [
    {
      id: 'explorer',
      title: 'Explorer',
      link: '/explorer',
      exact: true,
      icon: '/icons/cat-explorer.png',
      hideOnMobile: false,
    },
    {
      id: 'events',
      title: 'Événements',
      link: '/evenements',
      exact: false,
      icon: '/icons/cat-events.png',
      hideOnMobile: false,
    },
    {
      id: 'places',
      title: 'Lieux',
      link: '/lieux',
      exact: false,
      icon: '/icons/cat-places.png',
      hideOnMobile: false,
    },
    {
      id: 'bike',
      title: 'Vélô',
      link: '/carte',
      queryParams: { layer: 'velo' } as Record<string, string> | null,
      exact: false,
      icon: '/icons/cat-bike.png',
      hideOnMobile: true,
    },
    {
      id: 'map',
      title: 'Carte',
      link: '/carte',
      queryParams: null as Record<string, string> | null,
      exact: false,
      icon: '/icons/cat-map.png',
      hideOnMobile: false,
    },
    {
      id: 'weather',
      title: 'Météo',
      link: '/meteo',
      exact: false,
      icon: '/icons/cat-weather.png',
      hideOnMobile: false,
    },
  ];

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.menuOpen()) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeMenu();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusables = this.drawerFocusables();
    if (focusables.length === 0) {
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  protected toggleMenu(): void {
    if (this.menuOpen()) {
      this.closeMenu();
      return;
    }
    this.openMenu();
  }

  protected closeMenu(): void {
    if (!this.menuOpen()) {
      return;
    }
    this.menuOpen.set(false);
    queueMicrotask(() => {
      this.menuTrigger?.focus();
      this.menuTrigger = null;
    });
  }

  private openMenu(): void {
    this.menuTrigger = document.activeElement as HTMLElement | null;
    this.menuOpen.set(true);
    queueMicrotask(() => {
      const firstLink = this.drawerFocusables()[0];
      firstLink?.focus();
    });
  }

  private drawerFocusables(): HTMLElement[] {
    const drawer = this.host.nativeElement.querySelector('#site-menu');
    if (!drawer) {
      return [];
    }
    const nodes = drawer.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    return Array.from(nodes).filter(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && !node.hasAttribute('disabled'),
    );
  }

  protected brandHomeLink(): string {
    return this.isPlainShell() ? '/' : '/explorer';
  }

  private isPlainShellUrl(url: string): boolean {
    const path = url.split('?')[0];
    return path === '/' || path.startsWith('/onboarding');
  }

  protected isCategoryActive(category: (typeof this.categories)[number]): boolean {
    const urlTree = this.router.parseUrl(this.router.url);
    const path =
      '/' +
      (urlTree.root.children['primary']?.segments
        .map((segment) => segment.path)
        .join('/') ?? '');
    if (category.id === 'bike') {
      return path === '/carte' && urlTree.queryParams['layer'] === 'velo';
    }
    if (category.id === 'map') {
      // On mobile Vélô is hidden: highlight Carte for every map layer.
      if (path !== '/carte') {
        return false;
      }
      if (this.isMobileNav()) {
        return true;
      }
      return urlTree.queryParams['layer'] !== 'velo';
    }
    if (category.exact) {
      return path === category.link;
    }
    return path === category.link || path.startsWith(`${category.link}/`);
  }

  private isMobileNav(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;
  }
}
