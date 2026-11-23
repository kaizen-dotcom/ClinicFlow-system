import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientNavbarComponent } from './patient-navbar';

describe('PatientNavbarComponent', () => {
  let component: PatientNavbarComponent;
  let fixture: ComponentFixture<PatientNavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientNavbarComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PatientNavbarComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
