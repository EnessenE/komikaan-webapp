import { ChangeDetectionStrategy, Component  } from '@angular/core';

@Component({
    changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-loading',
  imports: [],
  templateUrl: './loading.component.html',
  styleUrl: './loading.component.scss'
})
export class LoadingComponent {

}
