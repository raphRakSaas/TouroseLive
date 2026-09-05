import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

const ONBOARDING_STORAGE_KEY = 'tourose-onboarding-done';

type OnboardingStep = {
  id: string;
  title: string;
  body: string;
  image: string;
  imageAlt: string;
};

@Component({
  selector: 'app-onboarding-page',
  imports: [],
  templateUrl: './onboarding-page.html',
  styleUrl: './onboarding-page.scss',
})
export class OnboardingPage implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly stepIndex = signal(0);

  protected readonly steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Toulouse, en un coup d’œil',
      body: 'TouRose rassemble open data de la Ville rose : événements, lieux, mobilité et météo — en lecture seule.',
      image: '/onboarding/welcome.jpg',
      imageAlt: 'Place du Capitole avec un pin rose TouRose',
    },
    {
      id: 'events',
      title: 'Ce qu’il se passe ce soir',
      body: 'Parcours l’agenda culturel, filtre par date et ouvre les fiches avec lieu et horaires.',
      image: '/onboarding/events.jpg',
      imageAlt: 'Ambiance d’événement en extérieur à Toulouse',
    },
    {
      id: 'map',
      title: 'Carte & Vélô',
      body: 'Une couche à la fois sur la carte : stations Vélô, parkings, événements ou lieux. Zoome, filtre, pars.',
      image: '/onboarding/map.jpg',
      imageAlt: 'Station Vélô dans une rue toulousaine',
    },
    {
      id: 'weather',
      title: 'Météo & qualité de l’air',
      body: 'Prévisions par quartier, lever et coucher du soleil, et indice ATMO pour la métropole.',
      image: '/onboarding/weather.jpg',
      imageAlt: 'Ciel matinal au-dessus de la Garonne',
    },
  ];

  ngOnInit(): void {
    const isReplay = this.route.snapshot.queryParamMap.get('replay') === '1';
    if (!isReplay && this.hasCompletedOnboarding()) {
      void this.router.navigateByUrl('/');
    }
  }

  protected currentStep(): OnboardingStep {
    return this.steps[this.stepIndex()] ?? this.steps[0];
  }

  protected isLastStep(): boolean {
    return this.stepIndex() >= this.steps.length - 1;
  }

  protected next(): void {
    if (this.isLastStep()) {
      this.finish();
      return;
    }
    this.stepIndex.update((index) => index + 1);
  }

  protected back(): void {
    this.stepIndex.update((index) => Math.max(0, index - 1));
  }

  protected skip(): void {
    this.finish();
  }

  protected finish(): void {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    } catch {
      // Ignore private mode / blocked storage.
    }
    void this.router.navigateByUrl('/');
  }

  private hasCompletedOnboarding(): boolean {
    try {
      return localStorage.getItem(ONBOARDING_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }
}

export function shouldShowOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) !== '1';
  } catch {
    return false;
  }
}
