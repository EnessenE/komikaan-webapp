import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [],
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss',
})
export class MainComponent implements OnInit {
  foundStops: string[] | undefined;
  foundStopsOrigin: string[] | undefined;
  originStop: string = 'Amsterdam Centraal';
  destinationStop: string = 'Eindhoven Centraal';
  possibility: string | undefined;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {}

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
    console.log(this.originStop + ' > ' + this.destinationStop);
    this.apiService.GetPossibility(this.originStop, this.destinationStop).subscribe({
      next: (data) => (this.possibility = data),
    });
  }
}
