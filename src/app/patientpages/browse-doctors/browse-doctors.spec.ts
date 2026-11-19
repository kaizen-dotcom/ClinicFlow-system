import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowseDoctors } from './browse-doctors';

describe('BrowseDoctors', () => {
  let component: BrowseDoctors;
  let fixture: ComponentFixture<BrowseDoctors>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowseDoctors],
    }).compileComponents();

    fixture = TestBed.createComponent(BrowseDoctors);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
