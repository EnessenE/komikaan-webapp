import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeOnlySelectionComponent } from './time-only-selection.component';

describe('TimeOnlySelectionComponent', () => {
  let component: TimeOnlySelectionComponent;
  let fixture: ComponentFixture<TimeOnlySelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeOnlySelectionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TimeOnlySelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
