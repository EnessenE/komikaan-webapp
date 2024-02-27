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

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {}

  SearchResult(stops: string[]) {
    this.foundStops = stops;
    console.log('new data loaded for stops');
  }

  async onSearchInputChange(event: any) {
    var searchText = event.target.value;
    console.log('Searching for ' + searchText);
    this.apiService.GetStops(event.target.value).subscribe({
      next: (data) => this.SearchResult(data),
    });
  }
}
