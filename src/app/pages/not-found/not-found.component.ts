import { ChangeDetectionStrategy, Component  } from '@angular/core';

@Component({
    changeDetection: ChangeDetectionStrategy.Default,
    selector: 'app-not-found',
    imports: [],
    templateUrl: './not-found.component.html',
    styleUrl: './not-found.component.scss'
})
export class NotFoundComponent {

}
