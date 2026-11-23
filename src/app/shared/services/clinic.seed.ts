import { addDays, addMinutes, addWeekdays, isWeekend, todayISO } from '../utils/time';
import { AppointmentRecord, ClinicDb, Doctor, Patient, PatientNotification, ScheduleBlock } from './clinic.models';

/**
 * Demo data, generated relative to today so the demo always has upcoming visits,
 * today's appointments and open slots. Replace with API calls once the backend exists.
 */
export function buildSeed(): ClinicDb {
  const today = todayISO();
  const d0 = addWeekdays(today, 0); // today, or the next weekday

  const doctors: Doctor[] = [
    { id: 'amelia-brooks', name: 'Dr. Amelia Brooks', specialty: 'General medicine', title: 'MD · Board-certified family physician',
      email: 'a.brooks@clinicflow.com', phone: '+1 (212) 555-0101', experienceYears: 12, languages: 'English · Spanish',
      location: 'Room 204', status: 'Active',
      bio: 'Thoughtful, preventive care for adults and families. Specializing in routine check-ups, chronic condition management, and helping you feel confident about your health.' },
    { id: 'daniel-kim', name: 'Dr. Daniel Kim', specialty: 'Cardiology', title: 'MD · Interventional cardiologist',
      email: 'd.kim@clinicflow.com', phone: '+1 (212) 555-0102', experienceYears: 10, languages: 'English · Korean',
      location: 'Room 108', status: 'Active',
      bio: 'Focused on heart health, preventive screening, and personalized care plans for patients with long-term cardiovascular concerns.' },
    { id: 'maya-patel', name: 'Dr. Maya Patel', specialty: 'Dentistry', title: 'DDS · Cosmetic and restorative dentist',
      email: 'm.patel@clinicflow.com', phone: '+1 (212) 555-0103', experienceYears: 8, languages: 'English · Hindi',
      location: 'Room 105', status: 'Active',
      bio: 'Provides restorative, preventive, and cosmetic dental care with a gentle approach tailored to each patient’s smile goals.' },
    { id: 'james-carter', name: 'Dr. James Carter', specialty: 'Dermatology', title: 'MD · Dermatology specialist',
      email: 'j.carter@clinicflow.com', phone: '+1 (212) 555-0104', experienceYears: 9, languages: 'English',
      location: 'Room 302', status: 'Active',
      bio: 'Helps patients treat acne, rashes, and skin conditions with evidence-based dermatology care and long-term skin health planning.' },
    { id: 'sophia-lee', name: 'Dr. Sophia Lee', specialty: 'Pediatrics', title: 'MD · Pediatrician',
      email: 's.lee@clinicflow.com', phone: '+1 (212) 555-0105', experienceYears: 11, languages: 'English · Mandarin',
      location: 'Room 210', status: 'Active',
      bio: 'Compassionate pediatric care for infants, children, and adolescents with preventive visits and family-centered treatment plans.' },
    { id: 'noah-williams', name: 'Dr. Noah Williams', specialty: 'Orthopedics', title: 'MD · Orthopedic surgeon',
      email: 'n.williams@clinicflow.com', phone: '+1 (212) 555-0106', experienceYears: 14, languages: 'English',
      location: 'Room 115', status: 'Active',
      bio: 'Treats bone, joint, and sports injuries with a focus on mobility restoration, pain management, and surgical recovery planning.' },
    { id: 'grace-lewis', name: 'Dr. Grace Lewis', specialty: 'General medicine', title: 'MD · Internal medicine',
      email: 'g.lewis@clinicflow.com', phone: '+1 (212) 555-0107', experienceYears: 7, languages: 'English · French',
      location: 'Room 206', status: 'On leave',
      bio: 'Internal medicine physician focused on adult preventive care and managing long-term conditions.' }
  ];

  const p = (id: string, fullName: string, email: string, phone: string, dob: string, gender: string,
             registeredOn: string, status: Patient['status'] = 'Active', address = ''): Patient =>
    ({ id, fullName, email, phone, dob, gender, address, registeredOn, status, password: 'Patient@123', emailUpdates: true });

  const patients: Patient[] = [
    p('CF-1024', 'Emma Wilson', 'emma.wilson@example.com', '+1 (555) 014-2086', '1992-03-14', 'Female', addDays(today, -50), 'Active', '24 Oak Street, Springfield'),
    p('CF-1025', 'James Anderson', 'j.anderson@example.com', '+1 (555) 013-4410', '1985-07-02', 'Male', addDays(today, -40)),
    p('CF-1026', 'Olivia Martin', 'olivia.m@example.com', '+1 (555) 019-2231', '1998-11-21', 'Female', addDays(today, -33)),
    p('CF-1027', 'Liam Johnson', 'liam.j@example.com', '+1 (555) 017-8890', '1979-01-09', 'Male', addDays(today, -28)),
    p('CF-1028', 'Sophia Davis', 'sophia.d@example.com', '+1 (555) 012-6674', '2001-05-30', 'Female', addDays(today, -21)),
    p('CF-1029', 'Noah Garcia', 'noah.g@example.com', '+1 (555) 018-3321', '1990-09-17', 'Male', addDays(today, -15)),
    p('CF-1030', 'Isabella Brown', 'isabella.b@example.com', '+1 (555) 011-9045', '1995-02-25', 'Female', addDays(today, -9)),
    p('CF-1031', 'Lucas Taylor', 'lucas.t@example.com', '+1 (555) 016-7712', '1988-12-03', 'Male', addDays(today, -6), 'Inactive'),
    p('CF-1032', 'Mia Thompson', 'mia.t@example.com', '+1 (555) 015-5528', '2003-08-14', 'Female', addDays(today, -2))
  ];

  // Weekday availability from 3 weeks ago to 6 weeks ahead for every active doctor.
  const hours: Record<string, [string, string][]> = {
    'maya-patel': [['10:00', '13:00'], ['14:00', '17:00']],
    'daniel-kim': [['09:00', '12:00'], ['13:00', '15:00']]
  };
  const schedules: ScheduleBlock[] = [];
  let blockSeq = 1;
  for (const doc of doctors.filter(d => d.status === 'Active')) {
    for (let day = addDays(today, -21); day <= addDays(today, 42); day = addDays(day, 1)) {
      if (isWeekend(day)) continue;
      for (const [start, end] of hours[doc.id] ?? [['09:00', '12:00'], ['13:00', '16:00']]) {
        schedules.push({ id: `SB-${blockSeq++}`, doctorId: doc.id, date: day, start, end, slotMinutes: 30 });
      }
    }
  }

  let seq = 1000;
  const at = (date: string, hhmm: string) => `${date}T${hhmm}:00`;
  const appt = (patientId: string, doctorId: string, date: string, time: string, type: string, status: AppointmentRecord['status'],
                reason: string, extra: Partial<AppointmentRecord> = {}): AppointmentRecord => {
    const requested = addDays(date, -7);
    const history = [{ label: 'Request sent', date: at(requested, '10:15') }];
    if (status !== 'Pending' && status !== 'Rejected') history.push({ label: 'Approved by clinic', date: at(addDays(requested, 1), '08:40') });
    if (status === 'Rejected') history.push({ label: 'Rejected by clinic', date: at(addDays(requested, 1), '11:05') });
    if (status === 'Cancelled') history.push({ label: extra.clinicNote?.includes('patient') ? 'Cancelled by patient' : 'Cancelled by clinic', date: at(addDays(date, -2), '18:30') });
    if (status === 'Completed') history.push({ label: 'Visit completed', date: at(date, addMinutes(time, 30)) });
    return {
      id: `APT-${++seq}`, patientId, doctorId, date, time, duration: 30, type, reason, firstVisit: false, status,
      requestedOn: history[0].date, history,
      clinicNote: status === 'Approved' ? 'Please arrive 15 minutes before your appointment and bring a valid ID and your current medication list.'
        : status === 'Pending' ? 'Your request is awaiting clinic review. You will be notified once it is approved.' : undefined,
      ...extra
    };
  };

  const appointments: AppointmentRecord[] = [
    // Emma Wilson (demo patient)
    appt('CF-1024', 'amelia-brooks', addWeekdays(today, 2), '09:00', 'General consultation', 'Approved', 'Routine check-up and preventive care.', { notes: 'Allergic to penicillin.' }),
    appt('CF-1024', 'daniel-kim', addWeekdays(today, 4), '10:30', 'Follow-up visit', 'Pending', 'Follow-up on blood pressure results.', { notes: 'Taking lisinopril 10 mg daily.' }),
    appt('CF-1024', 'james-carter', addWeekdays(today, -11), '14:00', 'Specialist consultation', 'Rejected', 'Recurring rash on forearms.',
      { firstVisit: true, clinicNote: 'Dr. Carter is unavailable at this time. Please choose another available slot.' }),
    appt('CF-1024', 'maya-patel', addWeekdays(today, -13), '11:00', 'Routine check-up', 'Cancelled', 'Six-month dental check-up.',
      { clinicNote: 'Cancelled by patient: schedule conflict.' }),
    appt('CF-1024', 'amelia-brooks', addWeekdays(today, -15), '09:00', 'General consultation', 'Completed', 'Persistent cough for two weeks.',
      { notes: 'Allergic to penicillin.', visitSummary: 'Mild upper respiratory infection. Advised rest and fluids; no antibiotics needed. Return if symptoms persist beyond 10 days.' }),
    appt('CF-1024', 'daniel-kim', addWeekdays(today, -25), '10:00', 'Specialist consultation', 'Completed', 'Annual heart health screening.',
      { firstVisit: true, visitSummary: 'ECG normal. Blood pressure slightly elevated (138/88). Continue current medication; follow-up in 4 weeks.' }),
    // Pending requests for the admin to review
    appt('CF-1025', 'daniel-kim', addWeekdays(today, 1), '13:30', 'Follow-up visit', 'Pending', 'Chest tightness after exercise.'),
    appt('CF-1026', 'maya-patel', addWeekdays(today, 3), '10:00', 'Routine check-up', 'Pending', 'Dental cleaning.'),
    appt('CF-1032', 'sophia-lee', addWeekdays(today, 2), '14:00', 'General consultation', 'Pending', 'Vaccination for younger sibling.', { firstVisit: true }),
    // Today's schedule
    appt('CF-1027', 'amelia-brooks', d0, '09:00', 'General consultation', 'Approved', 'Annual physical.'),
    appt('CF-1028', 'daniel-kim', d0, '09:30', 'Follow-up visit', 'Approved', 'Medication review.'),
    appt('CF-1029', 'amelia-brooks', d0, '10:00', 'General consultation', 'Approved', 'Sore throat and fever.'),
    appt('CF-1030', 'maya-patel', d0, '10:30', 'Routine check-up', 'Approved', 'Tooth sensitivity.'),
    // History for reports
    appt('CF-1025', 'amelia-brooks', addWeekdays(today, -3), '09:30', 'General consultation', 'Completed', 'Back pain.', { visitSummary: 'Muscle strain. Rest, stretching and ibuprofen as needed.' }),
    appt('CF-1026', 'james-carter', addWeekdays(today, -4), '13:00', 'Specialist consultation', 'Completed', 'Acne treatment.', { visitSummary: 'Started topical retinoid. Review in 8 weeks.' }),
    appt('CF-1027', 'noah-williams', addWeekdays(today, -5), '10:00', 'Specialist consultation', 'Completed', 'Knee pain after running.', { visitSummary: 'Patellar tendinopathy. Physiotherapy referral.' }),
    appt('CF-1028', 'sophia-lee', addWeekdays(today, -6), '14:30', 'Routine check-up', 'Completed', 'Child wellness visit.', { visitSummary: 'Healthy growth. Next visit in 6 months.' }),
    appt('CF-1029', 'maya-patel', addWeekdays(today, -7), '11:30', 'Routine check-up', 'Completed', 'Dental check-up.', { visitSummary: 'No cavities. Cleaning done.' }),
    appt('CF-1030', 'daniel-kim', addWeekdays(today, -8), '10:00', 'Specialist consultation', 'Completed', 'Palpitations.', { visitSummary: 'Holter monitor ordered.' }),
    appt('CF-1031', 'amelia-brooks', addWeekdays(today, -9), '15:00', 'General consultation', 'Cancelled', 'Headache.', { clinicNote: 'Cancelled by clinic: doctor unavailable.' }),
    appt('CF-1032', 'noah-williams', addWeekdays(today, -10), '13:30', 'Specialist consultation', 'Rejected', 'Wrist injury.', { clinicNote: 'Please visit urgent care for acute injuries.' })
  ];

  const emma = appointments.filter(a => a.patientId === 'CF-1024');
  const notifications: PatientNotification[] = [
    { id: 'N-1', patientId: 'CF-1024', type: 'APPROVAL', title: 'Your appointment is approved',
      subtitle: `Dr. Amelia Brooks · ${emma[0].date} · 09:00 AM`, message: 'Your visit is confirmed. Please arrive 15 minutes early.',
      createdAt: at(addDays(today, -1), '09:20'), read: false, action: { kind: 'view-appointment', appointmentId: emma[0].id } },
    { id: 'N-2', patientId: 'CF-1024', type: 'SCHEDULE UPDATE', title: 'New times available with Dr. Amelia Brooks',
      subtitle: 'General medicine', message: 'Additional morning appointments are now open for booking.',
      createdAt: at(addDays(today, -1), '08:45'), read: false, action: { kind: 'view-doctor', doctorId: 'amelia-brooks' } },
    { id: 'N-3', patientId: 'CF-1024', type: 'REJECTION', title: 'Your appointment request was not approved',
      subtitle: `Dr. James Carter · ${emma[2].date} · 02:00 PM`, message: 'The doctor is unavailable. Please choose another date.',
      createdAt: at(addDays(emma[2].date, -6), '10:15'), read: true, action: { kind: 'book', doctorId: 'james-carter' } },
    { id: 'N-4', patientId: 'CF-1024', type: 'CANCELLATION', title: 'Your appointment was cancelled',
      subtitle: `Dr. Maya Patel · ${emma[3].date} · 11:00 AM`, message: 'Cancelled at your request. You can book a new visit anytime.',
      createdAt: at(addDays(emma[3].date, -2), '18:30'), read: true, action: { kind: 'book', doctorId: 'maya-patel' } }
  ];

  return {
    version: 1,
    seq,
    admin: {
      fullName: 'Reynier Forth', email: 'admin@clinicflow.com', phone: '+1 (212) 555-0148', password: 'Admin@123',
      clinicName: 'ClinicFlow Medical Center', passwordUpdatedOn: addDays(today, -27)
    },
    doctors, patients, appointments, schedules, notifications
  };
}
