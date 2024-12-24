import { Component, Input, input } from '@angular/core';
import { GTFSSearchStop } from '../../models/gtfssearchstop';

@Component({
    selector: 'app-stop',
    imports: [],
    templateUrl: './stop.component.html',
    styleUrl: './stop.component.scss'
})
export class StopComponent {
    @Input()
    stop!: GTFSSearchStop;
}
