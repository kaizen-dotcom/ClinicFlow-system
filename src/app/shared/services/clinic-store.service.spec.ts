import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from '../../auth/auth.interceptor';
import { AuthService, UserRole } from '../../auth/auth.service';
import { addDays, todayISO } from '../utils/time';
import { ClinicStore } from './clinic-store.service';

const tomorrow = addDays(todayISO(), 1);

let http: HttpTestingController;

function setUp(): void {
  localStorage.clear();
  sessionStorage.clear();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      provideRouter([{ path: 'login', children: [] }])
    ]
  });
  http = TestBed.inject(HttpTestingController);
}

async function signIn(role: UserRole): Promise<AuthService> {
  const auth = TestBed.inject(AuthService);
  const login = auth.login('someone@clinic.test', 'Secret123');
  http.expectOne('/api/auth/login').flush({
    token: 'test-token', role, userId: role === 'admin' ? 'admin' : 'CF-1001',
    expiresAt: new Date(Date.now() + 3_600_000).toISOString()
  });
  await login;
  return auth;
}

/** Answers every request a patient's load makes. */
function flushPatientData(busy: { doctorId: string; date: string; time: string }[] = []): void {
  http.expectOne('/api/clinic').flush({ name: 'Test Clinic', phone: '' });
  http.expectOne('/api/doctors').flush([{ id: 'dr-a', name: 'Dr. A', specialty: 'General', status: 'Active' }]);
  http.expectOne('/api/patients/me').flush({ id: 'CF-1001', fullName: 'Ana Cruz' });
  http.expectOne('/api/appointments').flush([]);
  http.expectOne(r => r.url === '/api/availability').flush({
    blocks: [{ id: 1, doctorId: 'dr-a', date: tomorrow, start: '09:00', end: '10:00', slotMinutes: 30 }],
    busy
  });
  http.expectOne('/api/notifications').flush([]);
}

describe('ClinicStore', () => {
  beforeEach(setUp);
  afterEach(() => TestBed.resetTestingModule());

  it('starts empty: there is no built-in data', () => {
    const store = TestBed.inject(ClinicStore);
    expect(store.doctors()).toEqual([]);
    expect(store.patients()).toEqual([]);
    expect(store.appointments()).toEqual([]);
  });

  it('loads a patient\'s data with the token and marks taken slots as booked', async () => {
    await signIn('patient');
    const store = TestBed.inject(ClinicStore);

    const loading = store.ensureLoaded();
    const doctors = http.match('/api/doctors');
    expect(doctors[0].request.headers.get('Authorization')).toBe('Bearer test-token');
    doctors[0].flush([{ id: 'dr-a', name: 'Dr. A', specialty: 'General', status: 'Active' }]);
    http.expectOne('/api/clinic').flush({ name: 'Test Clinic', phone: '' });
    http.expectOne('/api/patients/me').flush({ id: 'CF-1001', fullName: 'Ana Cruz' });
    http.expectOne('/api/appointments').flush([]);
    http.expectOne(r => r.url === '/api/availability').flush({
      blocks: [{ id: 1, doctorId: 'dr-a', date: tomorrow, start: '09:00', end: '10:00', slotMinutes: 30 }],
      busy: [{ doctorId: 'dr-a', date: tomorrow, time: '09:00' }]
    });
    http.expectOne('/api/notifications').flush([]);
    await loading;

    expect(store.patients().map(p => p.id)).toEqual(['CF-1001']);
    expect(store.slotsFor('dr-a', tomorrow).map(s => [s.time, s.available])).toEqual([['09:00', false], ['09:30', true]]);
    expect(store.availableDates('dr-a')).toEqual([tomorrow]);
    http.verify();
  });

  it('returns the server\'s message when a change is refused, then reloads', async () => {
    await signIn('patient');
    const store = TestBed.inject(ClinicStore);

    const booking = store.requestAppointment({
      doctorId: 'dr-a', date: tomorrow, time: '09:00', type: 'General consultation', reason: 'Check-up', firstVisit: false
    });
    http.expectOne('/api/appointments').flush(
      { error: 'This time is no longer available.' }, { status: 409, statusText: 'Conflict' });
    await Promise.resolve();
    await new Promise(resolve => setTimeout(resolve));
    flushPatientData();

    expect(await booking).toEqual({ ok: false, error: 'This time is no longer available.' });
  });

  it('reports a load failure instead of showing stale data', async () => {
    await signIn('patient');
    const store = TestBed.inject(ClinicStore);

    const loading = store.ensureLoaded();
    http.expectOne('/api/doctors').error(new ProgressEvent('error'));
    await loading;

    expect(store.loadError()).toContain("Can't reach");
    expect(store.doctors()).toEqual([]);
  });
});

describe('AuthService', () => {
  beforeEach(setUp);
  afterEach(() => TestBed.resetTestingModule());

  it('keeps the session after a successful login and clears it on logout', async () => {
    const auth = await signIn('admin');
    expect(auth.role).toBe('admin');
    expect(auth.token).toBe('test-token');
    auth.logout();
    expect(auth.role).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it('returns the server\'s message for a wrong password', async () => {
    const auth = TestBed.inject(AuthService);
    const login = auth.login('a@b.test', 'nope');
    http.expectOne('/api/auth/login').flush(
      { error: 'Incorrect email or password.' }, { status: 401, statusText: 'Unauthorized' });
    expect(await login).toEqual({ error: 'Incorrect email or password.' });
    expect(auth.role).toBeNull();
  });

  it('signs out when the server rejects the token', async () => {
    const auth = await signIn('patient');
    const loading = TestBed.inject(ClinicStore).ensureLoaded();
    http.expectOne('/api/doctors').flush(null, { status: 401, statusText: 'Unauthorized' });
    await loading;
    expect(auth.role).toBeNull();
  });
});
