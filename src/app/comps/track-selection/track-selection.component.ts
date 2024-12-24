import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-track-selection',
    imports: [],
    templateUrl: './track-selection.component.html',
    styleUrl: './track-selection.component.scss'
})
export class TrackSelectionComponent {
    @Input()
    plannedTrack: string | null | undefined;
    @Input()
    actualTrack: string | null | undefined;
    @Input()
    cancelled: boolean = false;
}
