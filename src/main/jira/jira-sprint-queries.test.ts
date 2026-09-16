import { describe, expect, it } from 'vitest'
import { mapSprints } from './jira-sprint-queries'

describe('mapSprints', () => {
  it('puts active sprints first, drops duplicates across boards and lowercases state', () => {
    expect(
      mapSprints([
        { id: 12, name: 'Sprint 12', state: 'future' },
        { id: 11, name: 'Sprint 11', state: 'ACTIVE' },
        { id: 11, name: 'Sprint 11', state: 'active' },
        { id: 'bad', name: 'Nope', state: 'future' },
        { id: 13, state: 'future' }
      ])
    ).toEqual([
      { id: 11, name: 'Sprint 11', state: 'active' },
      { id: 12, name: 'Sprint 12', state: 'future' }
    ])
  })
})
