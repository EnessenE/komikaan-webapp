import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { JourneyResult } from '../../models/journey-result';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss',
})
export class MainComponent implements OnInit {
  foundStops: string[] | undefined;
  foundStopsOrigin: string[] | undefined;
  originStop: string = 'Amsterdam Centraal';
  destinationStop: string = 'Eindhoven Centraal';
  possibility: JourneyResult | undefined;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.originStop = localStorage.getItem('originStop') as string;
    this.destinationStop = localStorage.getItem('destinationStop') as string;
    if (this.originStop && this.destinationStop) {
      this.checkPossibility();
    }
  }

  async onSearchInputChange(event: any) {
    var searchText = event.target.value;
    console.log('Searching for ' + searchText);
    this.apiService.GetStops(event.target.value).subscribe({
      next: (data) => (this.foundStops = data),
    });
  }

  async onSearchInputChangeOrigin(event: any) {
    var searchText = event.target.value;
    console.log('Searching for ' + searchText);
    this.apiService.GetStops(event.target.value).subscribe({
      next: (data) => (this.foundStopsOrigin = data),
    });
  }

  selectStopOrigin(value: string) {
    this.originStop = value;
    this.checkPossibility();
  }

  selectStopDestination(value: string) {
    this.destinationStop = value;
    this.checkPossibility();
  }

  checkPossibility() {
    localStorage.setItem('originStop', this.originStop);
    localStorage.setItem('destinationStop', this.destinationStop);
    console.log(this.originStop + ' > ' + this.destinationStop);
    this.apiService
      .GetPossibility(this.originStop, this.destinationStop)
      .subscribe({
        next: (data) => this.setPossibility(data),
      });
  }

  setPossibility(journeyResult: JourneyResult) {
    this.possibility = journeyResult;
    this.possibility.travelAdvice.forEach((travelAdvice) => {
      var impossibility = travelAdvice.route.find(
        (item) => item.realisticTransfer === false
      );
      if (impossibility !== undefined) {
        console.log(JSON.stringify(impossibility));
        travelAdvice.realistic = false;
      }
      else{
        travelAdvice.realistic = true;
      }
    });
  }
}
