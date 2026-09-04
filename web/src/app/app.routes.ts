import { Routes } from '@angular/router';
import { EventsPage } from './pages/events/events-page';
import { HomePage } from './pages/home/home-page';
import { ParkingPage } from './pages/parking/parking-page';
import { PlacesPage } from './pages/places/places-page';
import { StationPage } from './pages/station/station-page';
import { WeatherPage } from './pages/weather/weather-page';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'velo/:stationId', component: StationPage },
  { path: 'parkings/:parkingId', component: ParkingPage },
  { path: 'meteo', component: WeatherPage },
  { path: 'evenements', component: EventsPage },
  { path: 'lieux', component: PlacesPage },
];
