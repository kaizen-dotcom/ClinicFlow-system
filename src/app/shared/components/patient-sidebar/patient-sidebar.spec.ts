import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientSidebarComponent } from './patient-sidebar';

describe('PatientSidebar', () => {
  let component: PatientSidebarComponent;
  let fixture: ComponentFixture<PatientSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientSidebarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PatientSidebarComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
