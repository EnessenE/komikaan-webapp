import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

export interface GTFSRoute {
    shortName: string;
    longName: string;
    dataOrigin: string;
    agency: string;
    description: string;
    type: number;
    url: string;
    color: string;
    textColor: string;
    lastUpdated: Date;
}

@Component({
  selector: 'app-route',
  standalone: true,
  imports: [CommonModule, NgbTooltipModule],
  templateUrl: './route.component.html',
  styleUrls: ['./route.component.scss']
})
export class RouteComponent {
  @Input() route!: GTFSRoute;
}