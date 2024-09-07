import { DatePipe, Time } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-time-only-selection',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './time-only-selection.component.html',
  styleUrl: './time-only-selection.component.scss'
})
export class TimeOnlySelectionComponent {
  @Input()
  planned: Date | null | undefined;
  @Input()
  actual: Date | null | undefined;
  @Input()
  cancelled: boolean | null | undefined;
  @Input()
  scheduleRelationship: string | null | undefined;
}
