import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeparturesComponent } from './departures.component';
import { DatePipe } from '@angular/common';

describe('DeparturesComponent', () => {
  let component: DeparturesComponent;
  let fixture: ComponentFixture<DeparturesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeparturesComponent, DatePipe]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DeparturesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
