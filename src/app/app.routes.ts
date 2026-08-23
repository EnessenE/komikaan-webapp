import { Routes } from '@angular/router';
import { MainComponent } from './pages/main/main.component';
import { DeparturesComponent } from './pages/departures/departures.component';
import { TripComponent } from './pages/trip/trip.component';
import { FeedsComponent } from './pages/feeds/feeds.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { FeedDetailsComponent } from './pages/feed-details/feed-details.component';
import { AgenciesComponent } from './pages/agencies/agencies.component';
import { CoverageComponent } from './pages/coverage/coverage.component';
import { FeedAlertsComponent } from './app/pages/feed-alerts/feed-alerts.component';
import { RouteDetailsComponent } from './pages/route-details/route-details.component';
import { MapComponent } from './pages/map/map.component';
import { TrainStationsComponent } from './pages/train-stations/train-stations.component';
import { DelaysComponent } from './pages/delays/delays.component';
import { MorealphaComponent } from './app/pages/morealpha/morealpha.component';

export const routes: Routes = [
    {
        path: 'stops/:id/:type',
        component: DeparturesComponent,
    },
    {
        path: 'stops/exact/:dataOrigin/:id',
        component: DeparturesComponent,
    },
    {
        path: 'trip/:id',
        component: TripComponent,
    },
    {
        path: 'routes/:dataOrigin/:id',
        component: RouteDetailsComponent,
    },
    {
        path: 'feed/:id',
        component: FeedDetailsComponent,
    },
    {
        path: 'agencies/:id',
        component: AgenciesComponent,
    },
    {
        path: 'alerts/:id',
        component: FeedAlertsComponent,
    },
    {
        path: 'feeds',
        component: FeedsComponent,
    },
    {
        path: 'coverage',
        component: CoverageComponent,
    },
    {
        path: 'map',
        component: MapComponent,
    },
    {
        path: 'train-stations',
        component: TrainStationsComponent,
    },
    {
        path: 'delays',
        component: DelaysComponent,
    },
    {
        path: 'morealpha',
        component: MorealphaComponent,
    },
    {
        path: '',
        component: MainComponent,
    },
    {
        path: '**',
        component: NotFoundComponent,
    },
];
