import { Component, input } from '@angular/core';

/** WMO weather interpretation codes → icon variant. */
export type WeatherIconKind =
  | 'clear'
  | 'mainly-clear'
  | 'partly-cloudy'
  | 'overcast'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'showers'
  | 'snow'
  | 'thunder';

export function weatherIconKind(code: number | null | undefined): WeatherIconKind {
  if (code === null || code === undefined) {
    return 'partly-cloudy';
  }
  if (code === 0) {
    return 'clear';
  }
  if (code === 1) {
    return 'mainly-clear';
  }
  if (code === 2) {
    return 'partly-cloudy';
  }
  if (code === 3) {
    return 'overcast';
  }
  if (code === 45 || code === 48) {
    return 'fog';
  }
  if (code >= 51 && code <= 57) {
    return 'drizzle';
  }
  if (code >= 61 && code <= 67) {
    return 'rain';
  }
  if (code >= 71 && code <= 77) {
    return 'snow';
  }
  if (code >= 80 && code <= 82) {
    return 'showers';
  }
  if (code >= 85 && code <= 86) {
    return 'snow';
  }
  if (code >= 95) {
    return 'thunder';
  }
  return 'partly-cloudy';
}

export function weatherIconFromPrecip(
  precipitationProbability: number | null | undefined,
): WeatherIconKind {
  const chance = precipitationProbability ?? 0;
  if (chance >= 70) {
    return 'rain';
  }
  if (chance >= 40) {
    return 'showers';
  }
  if (chance >= 20) {
    return 'partly-cloudy';
  }
  return 'clear';
}

export function weatherSkyTone(
  kind: WeatherIconKind,
  isDay = true,
): string {
  if (!isDay) {
    switch (kind) {
      case 'clear':
      case 'mainly-clear':
      case 'partly-cloudy':
        return 'night';
      case 'overcast':
      case 'fog':
        return 'night-soft';
      case 'drizzle':
      case 'rain':
      case 'showers':
      case 'thunder':
        return 'cool';
      case 'snow':
        return 'frost';
    }
  }
  switch (kind) {
    case 'clear':
    case 'mainly-clear':
      return 'warm';
    case 'partly-cloudy':
    case 'overcast':
    case 'fog':
      return 'soft';
    case 'drizzle':
    case 'rain':
    case 'showers':
    case 'thunder':
      return 'cool';
    case 'snow':
      return 'frost';
  }
}

@Component({
  selector: 'app-weather-icon',
  standalone: true,
  template: `
    <svg
      class="weather-icon"
      [attr.viewBox]="'0 0 64 64'"
      [attr.aria-hidden]="decorative() ? 'true' : null"
      [attr.role]="decorative() ? null : 'img'"
      [attr.aria-label]="decorative() ? null : label()"
      fill="none"
    >
      @switch (kind()) {
        @case ('clear') {
          @if (isDay()) {
            <circle class="sun-core" cx="32" cy="32" r="11" />
            <g class="sun-rays" stroke-linecap="round">
              <path d="M32 8v6M32 50v6M8 32h6M50 32h6M14.5 14.5l4.2 4.2M45.3 45.3l4.2 4.2M14.5 49.5l4.2-4.2M45.3 18.7l4.2-4.2" />
            </g>
          } @else {
            <g class="stars">
              <circle cx="14" cy="16" r="1.4" />
              <circle cx="50" cy="14" r="1.1" />
              <circle cx="46" cy="48" r="1.2" />
            </g>
            <path
              class="moon-core"
              d="M38 12c-8.8 0-16 7.2-16 16s7.2 16 16 16c2.6 0 5-.6 7.2-1.7A14 14 0 1 1 38 12Z"
            />
          }
        }
        @case ('mainly-clear') {
          @if (isDay()) {
            <circle class="sun-core" cx="38" cy="24" r="9" />
            <g class="sun-rays" stroke-linecap="round">
              <path d="M38 8v4M52 24h4M47.9 14.1l2.8-2.8M47.9 33.9l2.8 2.8" />
            </g>
          } @else {
            <path
              class="moon-core"
              d="M44 10c-6.6 0-12 5.4-12 12s5.4 12 12 12c2 0 3.8-.5 5.5-1.3A10.5 10.5 0 1 1 44 10Z"
            />
          }
          <path
            class="cloud-fill"
            d="M18 44c-5.5 0-10-3.8-10-8.5S12.5 27 18 27c1.1-4.8 5.4-8 10.5-8 4.6 0 8.5 2.6 10 6.5 1-.3 2-.5 3.1-.5 5 0 9 3.6 9 8s-4 9-9 9H18Z"
          />
          <path
            class="cloud-stroke"
            d="M18 44c-5.5 0-10-3.8-10-8.5S12.5 27 18 27c1.1-4.8 5.4-8 10.5-8 4.6 0 8.5 2.6 10 6.5 1-.3 2-.5 3.1-.5 5 0 9 3.6 9 8s-4 9-9 9H18Z"
          />
        }
        @case ('partly-cloudy') {
          @if (isDay()) {
            <circle class="sun-core" cx="42" cy="22" r="8" />
            <g class="sun-rays" stroke-linecap="round">
              <path d="M42 8v3.5M54 22h3.5M50.5 13.5l2.5-2.5" />
            </g>
          } @else {
            <path
              class="moon-core"
              d="M48 10c-5.5 0-10 4.5-10 10s4.5 10 10 10c1.6 0 3.1-.4 4.5-1.1A8.5 8.5 0 1 1 48 10Z"
            />
          }
          <path
            class="cloud-fill"
            d="M16 46c-6 0-11-4.2-11-9.5S10 27 16 27c1.2-5.2 5.8-9 11.4-9 5.2 0 9.6 3.1 11.1 7.5 1.1-.4 2.3-.6 3.5-.6 5.8 0 10.5 4.2 10.5 9.3S47.8 46 42 46H16Z"
          />
          <path
            class="cloud-stroke"
            d="M16 46c-6 0-11-4.2-11-9.5S10 27 16 27c1.2-5.2 5.8-9 11.4-9 5.2 0 9.6 3.1 11.1 7.5 1.1-.4 2.3-.6 3.5-.6 5.8 0 10.5 4.2 10.5 9.3S47.8 46 42 46H16Z"
          />
        }
        @case ('overcast') {
          <path
            class="cloud-fill"
            d="M14 40c-5.8 0-10.5-4-10.5-9S8.2 22 14 22c1-5.5 5.8-9.5 11.5-9.5 5.8 0 10.7 4 11.7 9.4 1.2-.5 2.5-.7 3.9-.7 6.1 0 11 4.5 11 10S47.2 41 41.1 41H14Z"
          />
          <path
            class="cloud-stroke"
            d="M14 40c-5.8 0-10.5-4-10.5-9S8.2 22 14 22c1-5.5 5.8-9.5 11.5-9.5 5.8 0 10.7 4 11.7 9.4 1.2-.5 2.5-.7 3.9-.7 6.1 0 11 4.5 11 10S47.2 41 41.1 41H14Z"
          />
          <path
            class="cloud-fill cloud-back"
            d="M20 50c-4.2 0-7.5-2.8-7.5-6.3S15.8 37.4 20 37.4c.8-3.6 4-6.2 7.8-6.2 3.5 0 6.5 2.1 7.6 5.1.8-.3 1.6-.4 2.5-.4 4 0 7.2 2.8 7.2 6.3S42 50 38 50H20Z"
          />
          <path
            class="cloud-stroke"
            d="M20 50c-4.2 0-7.5-2.8-7.5-6.3S15.8 37.4 20 37.4c.8-3.6 4-6.2 7.8-6.2 3.5 0 6.5 2.1 7.6 5.1.8-.3 1.6-.4 2.5-.4 4 0 7.2 2.8 7.2 6.3S42 50 38 50H20Z"
          />
        }
        @case ('fog') {
          <path class="fog-line" d="M12 24h40" stroke-linecap="round" />
          <path class="fog-line" d="M16 32h32" stroke-linecap="round" />
          <path class="fog-line" d="M10 40h44" stroke-linecap="round" />
          <path class="fog-line" d="M18 48h28" stroke-linecap="round" />
        }
        @case ('drizzle') {
          <path
            class="cloud-fill"
            d="M16 30c-5.5 0-10-3.8-10-8.5S10.5 13 16 13c1.1-4.8 5.4-8 10.5-8 4.6 0 8.5 2.6 10 6.5 1-.3 2-.5 3.1-.5 5 0 9 3.6 9 8s-4 9-9 9H16Z"
          />
          <path
            class="cloud-stroke"
            d="M16 30c-5.5 0-10-3.8-10-8.5S10.5 13 16 13c1.1-4.8 5.4-8 10.5-8 4.6 0 8.5 2.6 10 6.5 1-.3 2-.5 3.1-.5 5 0 9 3.6 9 8s-4 9-9 9H16Z"
          />
          <g class="rain-drops" stroke-linecap="round">
            <path d="M22 38v6M32 36v8M42 38v6" />
          </g>
        }
        @case ('rain') {
          <path
            class="cloud-fill"
            d="M16 28c-5.5 0-10-3.8-10-8.5S10.5 11 16 11c1.1-4.8 5.4-8 10.5-8 4.6 0 8.5 2.6 10 6.5 1-.3 2-.5 3.1-.5 5 0 9 3.6 9 8s-4 9-9 9H16Z"
          />
          <path
            class="cloud-stroke"
            d="M16 28c-5.5 0-10-3.8-10-8.5S10.5 11 16 11c1.1-4.8 5.4-8 10.5-8 4.6 0 8.5 2.6 10 6.5 1-.3 2-.5 3.1-.5 5 0 9 3.6 9 8s-4 9-9 9H16Z"
          />
          <g class="rain-drops" stroke-linecap="round">
            <path d="M20 36v10M28 34v12M36 36v10M44 34v12" />
          </g>
        }
        @case ('showers') {
          @if (isDay()) {
            <circle class="sun-core" cx="46" cy="16" r="6" />
          } @else {
            <path
              class="moon-core"
              d="M50 8c-4.4 0-8 3.6-8 8s3.6 8 8 8c1.3 0 2.5-.3 3.6-.9A7 7 0 1 1 50 8Z"
            />
          }
          <path
            class="cloud-fill"
            d="M14 30c-5.2 0-9.5-3.5-9.5-7.8S8.8 14.4 14 14.4c1-4.4 4.9-7.4 9.5-7.4 4.2 0 7.7 2.4 9.1 5.9.9-.3 1.8-.4 2.8-.4 4.6 0 8.3 3.2 8.3 7.2S40 30 35.4 30H14Z"
          />
          <path
            class="cloud-stroke"
            d="M14 30c-5.2 0-9.5-3.5-9.5-7.8S8.8 14.4 14 14.4c1-4.4 4.9-7.4 9.5-7.4 4.2 0 7.7 2.4 9.1 5.9.9-.3 1.8-.4 2.8-.4 4.6 0 8.3 3.2 8.3 7.2S40 30 35.4 30H14Z"
          />
          <g class="rain-drops" stroke-linecap="round">
            <path d="M18 38v10M26 36v12M34 38v10" />
          </g>
        }
        @case ('snow') {
          <path
            class="cloud-fill"
            d="M16 28c-5.5 0-10-3.8-10-8.5S10.5 11 16 11c1.1-4.8 5.4-8 10.5-8 4.6 0 8.5 2.6 10 6.5 1-.3 2-.5 3.1-.5 5 0 9 3.6 9 8s-4 9-9 9H16Z"
          />
          <path
            class="cloud-stroke"
            d="M16 28c-5.5 0-10-3.8-10-8.5S10.5 11 16 11c1.1-4.8 5.4-8 10.5-8 4.6 0 8.5 2.6 10 6.5 1-.3 2-.5 3.1-.5 5 0 9 3.6 9 8s-4 9-9 9H16Z"
          />
          <g class="snow-flakes" stroke-linecap="round">
            <path d="M22 38v8M18 42h8M20 40l4 4M20 44l4-4" />
            <path d="M36 36v8M32 40h8M34 38l4 4M34 42l4-4" />
            <path d="M48 40v6M45 43h6" />
          </g>
        }
        @case ('thunder') {
          <path
            class="cloud-fill"
            d="M15 26c-5.2 0-9.5-3.5-9.5-7.8S9.8 10.4 15 10.4c1-4.4 4.9-7.4 9.5-7.4 4.2 0 7.7 2.4 9.1 5.9.9-.3 1.8-.4 2.8-.4 4.6 0 8.3 3.2 8.3 7.2S41 26 36.4 26H15Z"
          />
          <path
            class="cloud-stroke"
            d="M15 26c-5.2 0-9.5-3.5-9.5-7.8S9.8 10.4 15 10.4c1-4.4 4.9-7.4 9.5-7.4 4.2 0 7.7 2.4 9.1 5.9.9-.3 1.8-.4 2.8-.4 4.6 0 8.3 3.2 8.3 7.2S41 26 36.4 26H15Z"
          />
          <path
            class="bolt"
            d="M30 28 22 42h8l-3 14 14-18h-8l5-10H30Z"
          />
        }
      }
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        line-height: 0;
      }

      .weather-icon {
        width: 100%;
        height: 100%;
        display: block;
      }

      .sun-core {
        fill: #f5b942;
        stroke: #d9961a;
        stroke-width: 1.5;
      }

      .sun-rays {
        stroke: #e0a428;
        stroke-width: 2.4;
      }

      .moon-core {
        fill: #e8edf5;
        stroke: #9aa8bc;
        stroke-width: 1.4;
      }

      .stars {
        fill: #c5d0e0;
      }

      .cloud-fill {
        fill: #f2f4f7;
      }

      .cloud-back {
        fill: #e6eaef;
      }

      .cloud-stroke {
        stroke: #8b93a0;
        stroke-width: 1.6;
        fill: none;
      }

      .fog-line {
        stroke: #9aa3af;
        stroke-width: 3;
        opacity: 0.85;
      }

      .rain-drops {
        stroke: #5b8def;
        stroke-width: 2.4;
      }

      .snow-flakes {
        stroke: #7a9bc4;
        stroke-width: 1.8;
      }

      .bolt {
        fill: #f0b429;
        stroke: #c98a12;
        stroke-width: 1.2;
        stroke-linejoin: round;
      }
    `,
  ],
})
export class WeatherIcon {
  readonly kind = input.required<WeatherIconKind>();
  readonly isDay = input(true);
  readonly decorative = input(true);
  readonly label = input('Météo');
}
