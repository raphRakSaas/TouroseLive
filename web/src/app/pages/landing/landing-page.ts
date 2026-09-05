import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  OnDestroy,
} from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
})
export class LandingPage implements OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private observer: IntersectionObserver | null = null;

  protected readonly pillars = [
    {
      title: 'L’agenda, sans le bruit',
      text: 'Ce soir, demain, le week-end — concerts, expos et festivals filtrés pour Toulouse, pas un flux générique.',
      image: '/onboarding/events.jpg',
      alt: 'Affiches d’événements sur un mur de Toulouse',
      link: '/evenements',
      cta: 'Voir ce qu’il se passe',
    },
    {
      title: 'Bouger sans perdre 10 minutes',
      text: 'Vélô, parkings, lieux et événements sur une carte claire. Une couche à la fois — tu vois ce qui compte, tout de suite.',
      image: '/onboarding/map.jpg',
      alt: 'Carte de Toulouse avec repères de mobilité',
      link: '/carte',
      cta: 'Ouvrir la carte',
    },
    {
      title: 'Le pulse du jour',
      text: 'Météo, air et alertes Tisséo avant de sortir. Pas besoin d’ouvrir trois apps pour savoir s’il faut un manteau.',
      image: '/onboarding/weather.jpg',
      alt: 'Ciel de Toulouse au-dessus des toits roses',
      link: '/meteo',
      cta: 'Voir météo & air',
    },
  ] as const;

  protected readonly sellingPoints = [
    {
      title: 'Zéro friction',
      text: 'Pas de compte, pas de pub, pas de newsletter obligatoire. Tu ouvres, tu vois.',
    },
    {
      title: 'Données de la ville',
      text: 'OpenAgenda, JCDecaux, Tisséo, Open-Meteo, Atmo, Métropole — des sources publiques, fraîches.',
    },
    {
      title: 'Fait pour Toulouse',
      text: 'Pas un outil générique “France”. Un compagnon local, pensé pour la Ville rose.',
    },
  ] as const;

  constructor() {
    afterNextRender(() => this.setupReveal());
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private setupReveal(): void {
    const root = this.host.nativeElement;
    const nodes = Array.from(
      root.querySelectorAll('[data-reveal]'),
    ) as HTMLElement[];
    if (nodes.length === 0) {
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (const node of nodes) {
        node.classList.add('is-revealed');
      }
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }
          entry.target.classList.add('is-revealed');
          this.observer?.unobserve(entry.target);
        }
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' },
    );

    for (const node of nodes) {
      this.observer.observe(node);
    }
  }
}
