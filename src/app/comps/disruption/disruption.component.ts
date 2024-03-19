import { Component, Input } from '@angular/core';
import { Disruption } from '../../models/journey-result';
import { DatePipe } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-disruption',
    standalone: true,
    imports: [DatePipe, NgbTooltipModule],
    templateUrl: './disruption.component.html',
    styleUrl: './disruption.component.scss',
})
export class DisruptionComponent {
    @Input()
    disruption!: Disruption;
}
