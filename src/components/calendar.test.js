import { describe, it, expect } from 'vitest'
import { starting_weekday } from './calendar.js'

// starting_weekday uses a Monday = 0 convention (Date.getDay() is Sunday = 0),
// so a raw Date.getDay() result needs `(getDay() + 6) % 7` to compare.
describe('starting_weekday', () => {
  it('2024-01-01 was a Monday -> 0', () => {
    expect(starting_weekday(1, 2024)).toBe(0)
  })

  it('2020-02-01 was a Saturday -> 5 (leap year February)', () => {
    expect(starting_weekday(2, 2020)).toBe(5)
  })

  it('2024-02-01 was a Thursday -> 3 (leap year February)', () => {
    expect(starting_weekday(2, 2024)).toBe(3)
  })

  it('handles a spread of known weekdays', () => {
    // 2023-01-01 was a Sunday -> 6
    expect(starting_weekday(1, 2023)).toBe(6)
    // 2022-07-01 was a Friday -> 4
    expect(starting_weekday(7, 2022)).toBe(4)
    // 2000-01-01 was a Saturday -> 5
    expect(starting_weekday(1, 2000)).toBe(5)
    // 1900-01-01 was a Monday -> 0
    expect(starting_weekday(1, 1900)).toBe(0)
    // 2100-01-01 (predicted, not a leap year) was a Friday -> 4
    expect(starting_weekday(1, 2100)).toBe(4)
  })

  it('century behavior: 1900 (not a leap year) vs 2000 (a leap year)', () => {
    // 1900-03-01 sits right after Feb 28 (no Feb 29 in 1900).
    expect(starting_weekday(3, 1900)).toBe(
      (new Date(1900, 2, 1).getDay() + 6) % 7
    )
    // 2000-03-01 sits right after Feb 29 (2000 is divisible by 400).
    expect(starting_weekday(3, 2000)).toBe(
      (new Date(2000, 2, 1).getDay() + 6) % 7
    )
  })

  it('matches (Date.getDay() + 6) % 7 for every month, years 1900-2100', () => {
    for (let year = 1900; year <= 2100; year++) {
      for (let month = 1; month <= 12; month++) {
        const expected = (new Date(year, month - 1, 1).getDay() + 6) % 7
        expect(starting_weekday(month, year)).toBe(expected)
      }
    }
  })
})
