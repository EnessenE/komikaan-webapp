import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TravelAdviceRouteComponent } from './travel-advice-route.component';

describe('TravelAdviceRouteComponent', () => {
  let component: TravelAdviceRouteComponent;
  let fixture: ComponentFixture<TravelAdviceRouteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TravelAdviceRouteComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TravelAdviceRouteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
