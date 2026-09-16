import { useMemo } from 'react'
import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import {
  jiraListAssignableUsers,
  jiraListPriorities,
  jiraListTransitions,
  jiraUpdateIssue
} from '@/runtime/runtime-jira-client'
import type {
  JiraIssue,
  JiraIssueUpdate,
  JiraPriority,
  JiraTransition,
  JiraUser
} from '../../../shared/jira-types'
import type { TaskPageJiraListStateModel } from './use-task-page-jira-list-state'

/** Inline editing for a Jira list row: option lookups plus one optimistic mutation. */
export type JiraInlineEditControls = {
  listUsers: (issue: JiraIssue) => Promise<JiraUser[]>
  listPriorities: (issue: JiraIssue) => Promise<JiraPriority[]>
  listTransitions: (issue: JiraIssue) => Promise<JiraTransition[]>
  update: (
    issue: JiraIssue,
    updates: JiraIssueUpdate,
    optimistic: Partial<JiraIssue>
  ) => Promise<void>
}

export function useTaskPageJiraInlineEdit(
  model: Pick<TaskPageJiraListStateModel, 'settings' | 'jiraTaskSourceContext' | 'setJiraIssues'>
): JiraInlineEditControls {
  const { settings, jiraTaskSourceContext, setJiraIssues } = model
  const patchJiraIssue = useAppStore((s) => s.patchJiraIssue)
  return useMemo(() => {
    const providerSettings = jiraTaskSourceContext ?? settings
    const patch = (key: string, fields: Partial<JiraIssue>): void => {
      setJiraIssues((prev) =>
        prev.map((issue) => (issue.key === key ? { ...issue, ...fields } : issue))
      )
      patchJiraIssue(key, fields, { sourceContext: jiraTaskSourceContext })
    }
    return {
      listUsers: (issue) =>
        jiraListAssignableUsers(providerSettings, issue.key, undefined, issue.siteId),
      listPriorities: (issue) => jiraListPriorities(providerSettings, issue.siteId),
      listTransitions: (issue) => jiraListTransitions(providerSettings, issue.key, issue.siteId),
      update: async (issue, updates, optimistic) => {
        patch(issue.key, optimistic)
        try {
          const result = await jiraUpdateIssue(providerSettings, issue.key, updates, issue.siteId)
          if (!result.ok) {
            throw new Error(result.error)
          }
        } catch (error) {
          // ponytail: reverts the whole row snapshot; per-field revert if concurrent edits on one row matter.
          patch(issue.key, issue)
          toast.error(
            error instanceof Error
              ? error.message
              : translate(
                  'auto.components.TaskPage.jiraInlineEditFailed',
                  'Failed to update issue.'
                )
          )
        }
      }
    }
  }, [jiraTaskSourceContext, patchJiraIssue, setJiraIssues, settings])
}
