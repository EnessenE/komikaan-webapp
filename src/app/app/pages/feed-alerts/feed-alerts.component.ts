import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router'; // Add Router
import { ApiService } from '../../../services/api.service';
import { Alert } from '../../../models/gtfsalert';
import { CommonModule } from '@angular/common';
import { ErrorComponent } from '../../../comps/error/error.component';
import { HttpErrorResponse } from '@angular/common/http';
import { combineLatest } from 'rxjs'; // For cleaner subscriptions

@Component({
  selector: 'app-feed-alerts',
  standalone: true, // Assuming standalone based on your imports
  imports: [CommonModule, ErrorComponent, RouterLink],
  templateUrl: './feed-alerts.component.html',
  styleUrl: './feed-alerts.component.scss'
})
export class FeedAlertsComponent implements OnInit {
  alerts: Alert[] = [];
  dataOrigin: string = '';
  limit: number = 100;
  offset: number = 0;
  loading: boolean = false;
  error: HttpErrorResponse | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router, // Inject Router
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    // Combine both params and queryParams so they trigger a reload together
    combineLatest([this.route.params, this.route.queryParams]).subscribe(([params, queryParams]) => {
      this.dataOrigin = params['id'];
      this.limit = queryParams['limit'] ? parseInt(queryParams['limit'], 10) : 100;
      this.offset = queryParams['offset'] ? parseInt(queryParams['offset'], 10) : 0;
      this.loadAlerts();
    });
  }

  loadAlerts(): void {
    if (!this.dataOrigin) return;
    
    this.loading = true;
    this.error = null;
    this.apiService.GetFeedAlertsWithPagination(this.dataOrigin, this.limit, this.offset).subscribe({
      next: (data) => {
        this.alerts = data;
        this.loading = false;
        window.scrollTo(0, 0); // Scroll to top when page changes
      },
      error: (error: HttpErrorResponse) => {
        this.error = error;
        this.loading = false;
      }
    });
  }

  changePage(newOffset: number): void {
    if (newOffset < 0) return;
    
    // Navigate to the same route but with updated query parameters
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { offset: newOffset },
      queryParamsHandling: 'merge' // Keeps the limit param if it exists
    });
  }
}