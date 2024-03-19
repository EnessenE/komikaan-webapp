import { DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-time-selection',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './time-selection.component.html',
  styleUrl: './time-selection.component.scss'
})
export class TimeSelectionComponent {
  @Input()
  planned: Date | null | undefined;
  @Input()
  actual: Date | null | undefined;
  @Input()
  cancelled: boolean | null | undefined;
}
