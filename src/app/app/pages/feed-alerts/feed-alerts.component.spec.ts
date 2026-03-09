import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeedAlertsComponent } from './feed-alerts.component';

describe('FeedAlertsComponent', () => {
  let component: FeedAlertsComponent;
  let fixture: ComponentFixture<FeedAlertsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeedAlertsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeedAlertsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
