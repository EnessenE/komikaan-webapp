import { Component, Input } from '@angular/core';
import { GTFSRoute } from '../../models/gtfsroute';

@Component({
    selector: 'app-route',
    imports: [RouteComponent],
    templateUrl: './route.component.html',
    styleUrl: './route.component.scss'
})
export class RouteComponent {
  @Input()
  route!: GTFSRoute;
}
