import { Component, HostListener, inject, signal } from '@angular/core';
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
    },
    {
      id: 'events',
      title: 'Événements',
      link: '/evenements',
      exact: false,
      icon: '/icons/cat-events.png',
    },
    {
      id: 'places',
      title: 'Lieux',
      link: '/lieux',
      exact: false,
      icon: '/icons/cat-places.png',
    },
    {
      id: 'bike',
      title: 'Vélô',
      link: '/carte',
      queryParams: { layer: 'velo' },
      exact: false,
      icon: '/icons/cat-bike.png',
    },
    {
      id: 'map',
      title: 'Carte',
      link: '/carte',
      queryParams: { layer: 'events' },
      exact: false,
      icon: '/icons/cat-map.png',
    },
    {
      id: 'weather',
      title: 'Météo',
      link: '/meteo',
      exact: false,
      icon: '/icons/cat-weather.png',
    },
  ];

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menuOpen.set(false);
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
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
    const path = '/' + (urlTree.root.children['primary']?.segments.map((segment) => segment.path).join('/') ?? '');
    if (category.id === 'bike') {
      return path === '/carte' && urlTree.queryParams['layer'] === 'velo';
    }
    if (category.id === 'map') {
      return path === '/carte' && urlTree.queryParams['layer'] !== 'velo';
    }
    if (category.exact) {
      return path === category.link;
    }
    return path === category.link || path.startsWith(category.link + '/');
  }
}
