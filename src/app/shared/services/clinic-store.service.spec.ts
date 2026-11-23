import { TestBed } from '@angular/core/testing';
import { ClinicStore } from './clinic-store.service';
import { AuthService } from '../../auth/auth.service';
import { addDays, addWeekdays, todayISO } from '../utils/time';

describe('ClinicStore', () => {
  let store: ClinicStore;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(ClinicStore);
  });

  /** First free slot for a doctor, as { date, time }. */
  function freeSlot(doctorId = 'amelia-brooks') {
    const date = store.availableDates(doctorId, 1)[0];
    const time = store.slotsFor(doctorId, date).find(s => s.available)!.time;
    return { date, time };
  }

  function request(patientId = 'CF-1024', doctorId = 'amelia-brooks') {
    const { date, time } = freeSlot(doctorId);
    return {
      date, time,
      result: store.requestAppointment({
        patientId, doctorId, date, time, type: 'General consultation', reason: 'Check-up', firstVisit: false
      })
    };
  }

  it('seeds doctors, patients and open slots', () => {
    expect(store.doctors().length).toBeGreaterThan(0);
    expect(store.patient('CF-1024')?.fullName).toBe('Emma Wilson');
    expect(store.availableDates('amelia-brooks').length).toBeGreaterThan(0);
  });

  it('creates a pending request and blocks double-booking of the same slot', () => {
    const { date, time, result } = request();
    expect(result.ok).toBe(true);
    const appt = store.appointments().find(a => a.id === (result as { id: string }).id)!;
    expect(appt.status).toBe('Pending');
    expect(store.slotsFor('amelia-brooks', date).find(s => s.time === time)!.available).toBe(false);

    const second = store.requestAppointment({
      patientId: 'CF-1025', doctorId: 'amelia-brooks', date, time, type: 'General consultation', reason: 'x', firstVisit: false
    });
    expect(second.ok).toBe(false);
  });

  it('approving notifies the patient', () => {
    const { result } = request();
    const id = (result as { id: string }).id;
    expect(store.approve(id).ok).toBe(true);
    expect(store.appointments().find(a => a.id === id)!.status).toBe('Approved');
    expect(store.notifications().some(n => n.patientId === 'CF-1024' && n.type === 'APPROVAL' &&
      n.action.kind === 'view-appointment' && n.action.appointmentId === id)).toBe(true);
  });

  it('rejecting requires a reason', () => {
    const { result } = request();
    const id = (result as { id: string }).id;
    expect(store.reject(id, '  ').ok).toBe(false);
    expect(store.reject(id, 'Doctor unavailable').ok).toBe(true);
    expect(store.appointments().find(a => a.id === id)!.status).toBe('Rejected');
  });

  it('cancelling frees the slot again', () => {
    const { date, time, result } = request();
    const id = (result as { id: string }).id;
    expect(store.cancel(id, 'patient', 'Conflict').ok).toBe(true);
    expect(store.slotsFor('amelia-brooks', date).find(s => s.time === time)!.available).toBe(true);
  });

  it('only approved appointments can be completed', () => {
    const { result } = request();
    const id = (result as { id: string }).id;
    expect(store.complete(id, 'notes').ok).toBe(false);
    store.approve(id);
    expect(store.complete(id, 'All good').ok).toBe(true);
    expect(store.appointments().find(a => a.id === id)!.visitSummary).toBe('All good');
  });

  it('does not book doctors on leave', () => {
    expect(store.availableDates('grace-lewis').length).toBe(0);
  });

  it('registers patients with unique emails', () => {
    expect(store.registerPatient({ fullName: 'New Person', email: 'new@example.com', password: 'Secret123' }).ok).toBe(true);
    expect(store.registerPatient({ fullName: 'Dup', email: 'NEW@example.com', password: 'Secret123' }).ok).toBe(false);
    expect(store.registerPatient({ fullName: 'Dup', email: 'emma.wilson@example.com', password: 'Secret123' }).ok).toBe(false);
  });

  it('skips overlapping availability and refuses to remove booked blocks', () => {
    const date = addWeekdays(addDays(todayISO(), 1), 0);
    const overlap = store.addAvailability({ doctorId: 'amelia-brooks', date, start: '10:00', end: '11:00', slotMinutes: 30, repeatWeeks: 0 });
    expect(overlap.ok).toBe(false);

    const { date: bookedDate, result } = request();
    expect(result.ok).toBe(true);
    const block = store.schedules().find(b => b.doctorId === 'amelia-brooks' && b.date === bookedDate &&
      store.slotsFor('amelia-brooks', bookedDate).some(s => s.booked))!;
    expect(store.removeAvailability(block.id).ok).toBe(false);
  });

  it('persists to localStorage', () => {
    request();
    TestBed.flushEffects();
    const saved = JSON.parse(localStorage.getItem('clinicflow.db.v1')!);
    expect(saved.appointments.length).toBe(store.appointments().length);
  });
});

describe('AuthService', () => {
  let auth: AuthService;
  let store: ClinicStore;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    auth = TestBed.inject(AuthService);
    store = TestBed.inject(ClinicStore);
  });

  it('logs in the admin with the right password only', () => {
    expect(auth.login('admin@clinicflow.com', 'wrong')).toEqual({ error: 'Incorrect email or password.' });
    expect(auth.login('ADMIN@clinicflow.com', 'Admin@123')).toEqual({ role: 'admin' });
    expect(auth.role).toBe('admin');
  });

  it('logs in patients and exposes their ID', () => {
    expect(auth.login('emma.wilson@example.com', 'Patient@123')).toEqual({ role: 'patient' });
    expect(auth.patientId()).toBe('CF-1024');
  });

  it('blocks inactive patients and unknown emails', () => {
    expect('error' in auth.login('lucas.t@example.com', 'Patient@123')).toBe(true);
    expect('error' in auth.login('nobody@example.com', 'Patient@123')).toBe(true);
  });

  it('lets newly registered patients log in', () => {
    store.registerPatient({ fullName: 'Ana Cruz', email: 'ana@example.com', password: 'Secret123' });
    expect(auth.login('ana@example.com', 'Secret123')).toEqual({ role: 'patient' });
  });
});
