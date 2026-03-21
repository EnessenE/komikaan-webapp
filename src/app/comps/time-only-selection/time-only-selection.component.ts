import { formatDate } from '@angular/common';
import { Component, Inject, Input, LOCALE_ID } from '@angular/core';

@Component({
    selector: 'app-time-only-selection',
    templateUrl: './time-only-selection.component.html',
    styleUrl: './time-only-selection.component.scss'
})
export class TimeOnlySelectionComponent {
  constructor(@Inject(LOCALE_ID) private readonly locale: string) {}

  @Input()
  planned: Date | string | null | undefined;
  @Input()
  actual: Date | string | null | undefined;
  @Input()
  tripScheduleRelationship: string | null | undefined;
  @Input()
  stopScheduleRelationship: string | null | undefined;
  @Input()
  timeZone: string | null | undefined;

  formatTime(value: Date | string | null | undefined): string {
    if (!value) return '—';
    return formatDate(value, 'HH:mm:ss', this.locale, this.timeZone || undefined);
  }

  hasDisplayedDelay(): boolean {
    if (!this.actual || !this.planned) return false;
    return this.formatTime(this.actual) !== this.formatTime(this.planned);
  }
}
