import { Component, Input, input } from '@angular/core';
import { SimplifiedStop } from '../../models/simplified-stop';

@Component({
    selector: 'app-stop',
    standalone: true,
    imports: [],
    templateUrl: './stop.component.html',
    styleUrl: './stop.component.scss',
})
export class StopComponent {
    @Input()
    stop!: SimplifiedStop;
}
