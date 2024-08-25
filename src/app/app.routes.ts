import { Routes } from '@angular/router';
import { MainComponent } from './pages/main/main.component';
import { DeparturesComponent } from './pages/departures/departures.component';
import { TripComponent } from './pages/trip/trip.component';
import { FeedsComponent } from './pages/feeds/feeds.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';

export const routes: Routes = [
    {
        path: 'stops/:id/:type',
        component: DeparturesComponent,
    },{
        path: 'trip/:id',
        component: TripComponent,
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
