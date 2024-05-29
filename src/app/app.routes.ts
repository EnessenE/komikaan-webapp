import { Routes } from '@angular/router';
import { MainComponent } from './pages/main/main.component';
import { DeparturesComponent } from './pages/departures/departures.component';
import { TripComponent } from './pages/trip/trip.component';

export const routes: Routes = [
    {
        path: 'stops/:id',
        component: DeparturesComponent,
    },{
        path: 'trip/:id',
        component: TripComponent,
    },
    {
        path: '**',
        component: MainComponent,
    },
];
