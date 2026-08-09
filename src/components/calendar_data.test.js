import { describe, it, expect } from 'vitest'
import {
  CalendarData,
  calc_days_in_month,
  DEFAULT_VISUALS
} from './calendar_data.js'

describe('calc_days_in_month', () => {
  it('handles 31-day months', () => {
    for (const month of [1, 3, 5, 7, 8, 10, 12]) {
      expect(calc_days_in_month(month, 2023)).toBe(31)
    }
  })

  it('handles 30-day months', () => {
    for (const month of [4, 6, 9, 11]) {
      expect(calc_days_in_month(month, 2023)).toBe(30)
    }
  })

  it('applies the Gregorian leap year rules to February', () => {
    // Not divisible by 4.
    expect(calc_days_in_month(2, 2023)).toBe(28)
    // Divisible by 4, not by 100.
    expect(calc_days_in_month(2, 2024)).toBe(29)
    // Divisible by 100 but not by 400 -> not a leap year.
    expect(calc_days_in_month(2, 1900)).toBe(28)
    // Divisible by 400 -> leap year.
    expect(calc_days_in_month(2, 2000)).toBe(29)
    // Divisible by 100 but not by 400 -> not a leap year.
    expect(calc_days_in_month(2, 2100)).toBe(28)
  })
})

describe('CalendarData JSON round-trip', () => {
  it('preserves day text, checkboxes and visuals through save/load', () => {
    const original = new CalendarData()
    original.initialize_new(2026, { work: '#ff0000', gym: '#00ff00' })

    original.set_day_text(2026, 3, 15, 'Some note\nwith lines')
    original.set_day_checkboxes(2026, 3, 15, ['work'])
    original.set_day_text(2026, 12, 25, 'Holiday')
    original.set_day_checkboxes(2026, 12, 25, ['work', 'gym'])

    const json_string = original.save_to_jsons()

    const restored = new CalendarData()
    const ok = restored.initialize_from_jsons(json_string)

    expect(ok).toBe(true)
    expect(restored.get_day_text(2026, 3, 15)).toBe('Some note\nwith lines')
    expect(restored.get_day_checkboxes(2026, 3, 15)).toEqual(['work'])
    expect(restored.get_day_text(2026, 12, 25)).toBe('Holiday')
    expect(restored.get_day_checkboxes(2026, 12, 25)).toEqual(['work', 'gym'])
    expect(restored.checkboxes).toEqual({ work: '#ff0000', gym: '#00ff00' })
    expect(restored.visuals).toEqual(original.visuals)
  })

  it('returns false for garbage input missing required fields', () => {
    const cal = new CalendarData()
    expect(cal.initialize_from_jsons(JSON.stringify({}))).toBe(false)
  })

  it('falls back to default visuals when the payload has no visuals block', () => {
    const original = new CalendarData()
    original.initialize_new(2026)
    const parsed = JSON.parse(original.save_to_jsons())
    delete parsed.visuals

    const restored = new CalendarData()
    const ok = restored.initialize_from_jsons(JSON.stringify(parsed))

    expect(ok).toBe(true)
    expect(restored.visuals).toEqual(DEFAULT_VISUALS)
  })
})
