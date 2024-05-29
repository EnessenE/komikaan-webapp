import { Routes } from '@angular/router';
import { MainComponent } from './pages/main/main.component';
import { DeparturesComponent } from './pages/departures/departures.component';

export const routes: Routes = [
    {
        path: 'stops/:id',
        component: DeparturesComponent,
    },
    {
        path: '**',
        component: MainComponent,
    },
];
