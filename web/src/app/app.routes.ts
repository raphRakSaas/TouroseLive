import { Routes } from '@angular/router';
import { DonatePage } from './pages/donate/donate-page';
import { EventDetailPage } from './pages/event-detail/event-detail-page';
import { EventsPage } from './pages/events/events-page';
import { HomePage } from './pages/home/home-page';
import { LegalPage } from './pages/legal/legal-page';
import { MapPage } from './pages/map/map-page';
import { ParkingPage } from './pages/parking/parking-page';
import { PlaceDetailPage } from './pages/place-detail/place-detail-page';
import { PlacesPage } from './pages/places/places-page';
import { StationPage } from './pages/station/station-page';
import { WeatherPage } from './pages/weather/weather-page';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'carte', component: MapPage },
  { path: 'velo/:stationId', component: StationPage },
  { path: 'parkings/:parkingId', component: ParkingPage },
  { path: 'meteo', component: WeatherPage },
  { path: 'evenements', component: EventsPage },
  { path: 'evenements/:eventId', component: EventDetailPage },
  { path: 'lieux', component: PlacesPage },
  { path: 'lieux/:placeId', component: PlaceDetailPage },
  { path: 'dons', component: DonatePage },
  { path: 'legal', component: LegalPage },
];
