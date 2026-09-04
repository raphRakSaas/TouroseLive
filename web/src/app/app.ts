import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly menuOpen = signal(false);

  protected readonly categories = [
    {
      id: 'explorer',
      title: 'Tout voir',
      link: '/',
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
      exact: false,
      icon: '/icons/cat-bike.png',
    },
    {
      id: 'map',
      title: 'Carte',
      link: '/carte',
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
}
