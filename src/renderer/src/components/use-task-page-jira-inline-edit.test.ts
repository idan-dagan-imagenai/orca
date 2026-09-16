// @vitest-environment happy-dom

import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { JiraIssue, JiraUser } from '../../../shared/jira-types'
import { useTaskPageJiraInlineEdit } from './use-task-page-jira-inline-edit'

const updateIssue = vi.fn()
const patchJiraIssue = vi.fn()
const toastError = vi.fn()

vi.mock('sonner', () => ({ toast: { error: (...args: unknown[]) => toastError(...args) } }))
vi.mock('@/store', () => ({
  useAppStore: (selector: (state: { patchJiraIssue: typeof patchJiraIssue }) => unknown) =>
    selector({ patchJiraIssue })
}))
vi.mock('@/runtime/runtime-jira-client', () => ({
  jiraListAssignableUsers: vi.fn(async () => []),
  jiraListPriorities: vi.fn(async () => []),
  jiraListTransitions: vi.fn(async () => []),
  jiraUpdateIssue: (...args: unknown[]) => updateIssue(...args)
}))
vi.mock('@/i18n/i18n', () => ({ translate: (_key: string, fallback: string) => fallback }))

const alice: JiraUser = { accountId: 'a1', displayName: 'Alice' }
const bob: JiraUser = { accountId: 'b2', displayName: 'Bob' }
// oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: only key/title/assignee are read by the hook.
const issue = { key: 'RND-1', siteId: 'site', title: 'Old', assignee: alice } as JiraIssue

function setup(): {
  update: ReturnType<typeof useTaskPageJiraInlineEdit>['update']
  issues: () => JiraIssue[]
} {
  let issues: JiraIssue[] = [issue]
  const setJiraIssues = vi.fn((update: JiraIssue[] | ((prev: JiraIssue[]) => JiraIssue[])) => {
    issues = typeof update === 'function' ? update(issues) : update
  })
  const { result } = renderHook(() =>
    useTaskPageJiraInlineEdit({ settings: null, jiraTaskSourceContext: null, setJiraIssues })
  )
  return { update: result.current.update, issues: () => issues }
}

describe('useTaskPageJiraInlineEdit', () => {
  it('applies the change optimistically and sends the update', async () => {
    updateIssue.mockResolvedValueOnce({ ok: true })
    const { update, issues } = setup()
    await update(issue, { assigneeAccountId: 'b2' }, { assignee: bob })
    expect(issues()[0].assignee).toEqual(bob)
    expect(updateIssue).toHaveBeenCalledWith(null, 'RND-1', { assigneeAccountId: 'b2' }, 'site')
    expect(patchJiraIssue).toHaveBeenCalledWith('RND-1', { assignee: bob }, { sourceContext: null })
  })

  it('reverts the row when Jira rejects the change', async () => {
    updateIssue.mockResolvedValueOnce({ ok: false, error: 'nope' })
    const { update, issues } = setup()
    await update(issue, { title: 'New' }, { title: 'New' })
    expect(issues()[0].title).toBe('Old')
    expect(patchJiraIssue).toHaveBeenLastCalledWith('RND-1', issue, { sourceContext: null })
    expect(toastError).toHaveBeenCalledWith('nope')
  })
})
