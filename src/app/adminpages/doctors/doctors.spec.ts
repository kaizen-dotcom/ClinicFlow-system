import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Doctors } from './doctors';

describe('DoctorsComponent', () => {
  let component: Doctors;
  let fixture: ComponentFixture<Doctors>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Doctors],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Doctors);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
