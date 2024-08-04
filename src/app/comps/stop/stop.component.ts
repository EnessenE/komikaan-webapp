import { Component, Input, input } from '@angular/core';
import { GTFSStop } from '../../models/gtfsstop';

@Component({
    selector: 'app-stop',
    standalone: true,
    imports: [],
    templateUrl: './stop.component.html',
    styleUrl: './stop.component.scss',
})
export class StopComponent {
    @Input()
    stop!: GTFSStop;
}
