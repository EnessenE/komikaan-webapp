import { Component, Input } from '@angular/core';
import { Disruption } from '../../models/journey-result';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'app-disruption',
    standalone: true,
    imports: [DatePipe],
    templateUrl: './disruption.component.html',
    styleUrl: './disruption.component.scss',
})
export class DisruptionComponent {
    @Input()
    disruption!: Disruption;
}
