import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MorealphaComponent } from './morealpha.component';

describe('MorealphaComponent', () => {
  let component: MorealphaComponent;
  let fixture: ComponentFixture<MorealphaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MorealphaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MorealphaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
