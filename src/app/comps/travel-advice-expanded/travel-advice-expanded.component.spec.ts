import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TravelAdviceExpandedComponent } from './travel-advice-expanded.component';

describe('TravelAdviceExpandedComponent', () => {
  let component: TravelAdviceExpandedComponent;
  let fixture: ComponentFixture<TravelAdviceExpandedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TravelAdviceExpandedComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TravelAdviceExpandedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
