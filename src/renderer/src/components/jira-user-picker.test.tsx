// @vitest-environment happy-dom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { JiraUserOptionList } from './jira-user-picker'
import type { JiraUser } from '../../../shared/jira-types'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const USERS: JiraUser[] = [
  { accountId: '1', displayName: 'Idan Dagan', email: 'idan.d@imagen-ai.com' },
  { accountId: '2', displayName: 'Dana Levi', email: 'dana@imagen-ai.com' },
  { accountId: '3', displayName: 'Noa Shapira', email: 'noa@imagen-ai.com' }
]

function renderList(
  searchable?: boolean,
  onSearch?: (query: string) => Promise<JiraUser[]>
): { host: HTMLDivElement; unmount: () => void } {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => {
    root.render(
      React.createElement(JiraUserOptionList, {
        users: USERS,
        onSelect: () => {},
        ...(searchable === undefined ? {} : { searchable }),
        ...(onSearch ? { onSearch } : {})
      })
    )
  })
  return { host, unmount: () => act(() => root.unmount()) }
}

function names(host: HTMLDivElement): string[] {
  return [...host.querySelectorAll('button')].map((button) => button.textContent ?? '')
}

function type(host: HTMLDivElement, value: string): void {
  const input = host.querySelector('input')
  if (!input) {
    throw new Error('search input missing')
  }
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setValue?.call(input, value)
  act(() => {
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('JiraUserOptionList', () => {
  it('narrows a long list by name prefix', () => {
    const { host, unmount } = renderList()
    expect(names(host)).toHaveLength(3)

    type(host, 'da')
    expect(names(host)).toEqual(['Idan Dagan', 'Dana Levi'])

    unmount()
  })

  it('matches email too, and says so when nothing matches', () => {
    const { host, unmount } = renderList()

    type(host, 'noa@')
    expect(names(host)).toEqual(['Noa Shapira'])

    type(host, 'zzz')
    expect(names(host)).toEqual([])
    expect(host.textContent).toContain('No users found')

    unmount()
  })

  it('asks the server for names beyond the loaded page', async () => {
    // Jira returns only the first page of assignable users, so this name is one
    // the client-side filter alone can never reach.
    const offPage: JiraUser = { accountId: '9', displayName: 'Tovi Aharon' }
    const onSearch = vi.fn(async () => [offPage])
    vi.useFakeTimers()
    const { host, unmount } = renderList(true, onSearch)

    type(host, 'tov')
    expect(names(host)).toEqual([])

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })

    expect(onSearch).toHaveBeenCalledWith('tov')
    expect(names(host)).toEqual(['Tovi Aharon'])

    unmount()
    vi.useRealTimers()
  })

  it('omits the filter when the caller already searches server-side', () => {
    const { host, unmount } = renderList(false)

    expect(host.querySelector('input')).toBeNull()
    expect(names(host)).toHaveLength(3)

    unmount()
  })
})
