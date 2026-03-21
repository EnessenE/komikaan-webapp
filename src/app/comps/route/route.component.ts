import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { GTFSRoute } from '../../models/gtfsroute';

@Component({
  selector: 'app-route',
  standalone: true,
  imports: [CommonModule, RouterLink, NgbTooltipModule],
  templateUrl: './route.component.html',
  styleUrls: ['./route.component.scss']
})
export class RouteComponent {
  @Input() route!: GTFSRoute;
  @Input() minimal: boolean = false;
  @Input() navigable: boolean = true;

  get isNavigable(): boolean {
    return this.navigable && !!this.route?.dataOrigin && !!this.routeKey;
  }

  get routeKey(): string | undefined {
    return this.route?.id || this.route?.shortName;
  }
}