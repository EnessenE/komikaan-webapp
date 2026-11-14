import { ChangeDetectionStrategy, Component, Input, input  } from '@angular/core';
import { GTFSSearchStop } from '../../models/gtfssearchstop';

@Component({
    changeDetection: ChangeDetectionStrategy.Default,
    selector: 'app-stop',
    imports: [],
    templateUrl: './stop.component.html',
    styleUrl: './stop.component.scss'
})
export class StopComponent {
    @Input()
    stop!: GTFSSearchStop;
}
