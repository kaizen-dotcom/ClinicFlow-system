import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule, NgModel } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { DatePicker } from './date-picker';

@Component({
  imports: [FormsModule, DatePicker],
  template: `<app-date-picker name="dob" max="2026-11-26" [(ngModel)]="dob" required />`
})
class Host {
  dob = '2006-10-28';
}

describe('DatePicker', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); };
    await settle();
    await settle();
    const el: HTMLElement = fixture.nativeElement;
    const input = el.querySelector('input')!;
    const model = fixture.debugElement.query(By.directive(DatePicker)).injector.get(NgModel);
    const click = async (selector: string) => { el.querySelector<HTMLElement>(selector)!.click(); await settle(); };
    const type = async (text: string) => { input.value = text; input.dispatchEvent(new Event('input')); await settle(); };
    return { host: fixture.componentInstance, el, input, model, click, type };
  }

  it('shows the model value and opens on its month', async () => {
    const { el, input, click } = await setup();
    expect(input.value).toBe('10/28/2006');
    await click('.dp-toggle');
    expect(el.querySelector<HTMLSelectElement>('.dp-month')!.value).toBe('9');
    expect(el.querySelector<HTMLSelectElement>('.dp-year')!.value).toBe('2006');
    expect(el.querySelector('.dp-day.selected')!.getAttribute('data-date')).toBe('2006-10-28');
  });

  it('writes the picked day to the model and closes', async () => {
    const { host, el, input, click } = await setup();
    await click('.dp-toggle');
    await click('[data-date="2006-10-12"]');
    expect(host.dob).toBe('2006-10-12');
    expect(input.value).toBe('10/12/2006');
    expect(el.querySelector('.dp-popup')).toBeNull();
  });

  it('jumps to another year', async () => {
    const { el, click } = await setup();
    await click('.dp-toggle');
    const year = el.querySelector<HTMLSelectElement>('.dp-year')!;
    year.value = '1990';
    year.dispatchEvent(new Event('change'));
    await click('.dp-month');
    expect(el.querySelector('[data-date="1990-10-28"]')).not.toBeNull();
  });

  it('accepts typed dates and rejects impossible or future ones', async () => {
    const { host, model, type } = await setup();
    await type('2/29/2004');
    expect(host.dob).toBe('2004-02-29');
    await type('2/29/2005');
    expect(host.dob).toBe('');
    expect(model.errors?.['required']).toBeTruthy();
    await type('11/27/2026');
    expect(host.dob).toBe('');
  });

  it('disables days after max, and Clear empties the value', async () => {
    const { host, el, click, type } = await setup();
    await type('11/01/2026');
    await click('.dp-toggle');
    expect(el.querySelector<HTMLButtonElement>('[data-date="2026-11-27"]')!.disabled).toBe(true);
    await click('.dp-clear');
    expect(host.dob).toBe('');
  });
});
