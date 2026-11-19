import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyAppointments } from './appointments';

describe('Appointments', () => {
  let component: MyAppointments;
  let fixture: ComponentFixture<MyAppointments>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyAppointments],
    }).compileComponents();

    fixture = TestBed.createComponent(MyAppointments);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
