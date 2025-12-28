import { Routes } from '@angular/router';
import { MainComponent } from './pages/main/main.component';
import { DeparturesComponent } from './pages/departures/departures.component';
import { TripComponent } from './pages/trip/trip.component';
import { FeedsComponent } from './pages/feeds/feeds.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { FeedDetailsComponent } from './pages/feed-details/feed-details.component';
import { AgenciesComponent } from './pages/agencies/agencies.component';

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
        path: 'feed/:id',
        component: FeedDetailsComponent,
    },
    {
        path: 'agencies/:id',
        component: AgenciesComponent,
    },
    {
        path: 'feeds',
        component: FeedsComponent,
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
