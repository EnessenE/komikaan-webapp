import { ChangeDetectionStrategy, Component  } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
    changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-morealpha',
  imports: [RouterModule],
  templateUrl: './morealpha.component.html',
  styleUrl: './morealpha.component.scss'
})
export class MorealphaComponent {

}
