import { Component, Input } from '@angular/core';
import { TravelAdvice } from '../../models/journey-result';
import { DatePipe } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-travel-advice-expanded',
  standalone: true,
  imports: [DatePipe, NgbTooltipModule],
  templateUrl: './travel-advice-expanded.component.html',
  styleUrl: './travel-advice-expanded.component.scss'
})
export class TravelAdviceExpandedComponent {
  @Input()
  travelAdvice!: TravelAdvice;
}
