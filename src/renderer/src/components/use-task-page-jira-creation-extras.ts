import { useEffect, useState } from 'react'
import type { TaskPageJiraCreationStateModel } from './use-task-page-jira-creation-state'
import type { JiraPriority, JiraProjectSprints, JiraUser } from '../../../shared/jira-types'
import { jiraListPriorities, jiraListProjectSprints } from '@/runtime/runtime-jira-client'

const NO_SPRINTS: JiraProjectSprints = { sprintFieldId: null, sprints: [] }

/** Optional priority, assignee and sprint pickers for the create dialog. */
export function useTaskPageJiraCreationExtras(model: TaskPageJiraCreationStateModel) {
  const {
    settings,
    jiraConnected,
    jiraTaskSourceContext,
    newJiraIssueOpen,
    newJiraIssueTargetProject
  } = model
  const [newJiraIssuePriorityId, setNewJiraIssuePriorityId] = useState<string | null>(null)
  const [newJiraIssueAssignee, setNewJiraIssueAssignee] = useState<JiraUser | null>(null)
  const [newJiraIssueSprintId, setNewJiraIssueSprintId] = useState<string | null>(null)
  const [jiraCreatePriorities, setJiraCreatePriorities] = useState<JiraPriority[]>([])
  const [jiraCreateSprints, setJiraCreateSprints] = useState<JiraProjectSprints>(NO_SPRINTS)

  useEffect(() => {
    // Why: picks are scoped to one project; both lists are best-effort and hide when empty.
    setNewJiraIssuePriorityId(null)
    setNewJiraIssueAssignee(null)
    setNewJiraIssueSprintId(null)
    if (!newJiraIssueOpen || !jiraConnected || !newJiraIssueTargetProject) {
      setJiraCreatePriorities([])
      setJiraCreateSprints(NO_SPRINTS)
      return
    }
    let cancelled = false
    const providerSettings = jiraTaskSourceContext ?? settings
    void jiraListPriorities(providerSettings, newJiraIssueTargetProject.siteId)
      .then((priorities) => {
        if (!cancelled) {
          setJiraCreatePriorities(priorities)
        }
      })
      .catch(() => {})
    void jiraListProjectSprints(
      providerSettings,
      newJiraIssueTargetProject.key,
      newJiraIssueTargetProject.siteId
    )
      .then((sprints) => {
        if (!cancelled) {
          setJiraCreateSprints(sprints)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [settings, jiraConnected, jiraTaskSourceContext, newJiraIssueOpen, newJiraIssueTargetProject])

  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the model is widened in place with every field assigned right below, matching the other task-page state hooks.
  const nextModel = model as typeof model & {
    newJiraIssuePriorityId: typeof newJiraIssuePriorityId
    setNewJiraIssuePriorityId: typeof setNewJiraIssuePriorityId
    newJiraIssueAssignee: typeof newJiraIssueAssignee
    setNewJiraIssueAssignee: typeof setNewJiraIssueAssignee
    newJiraIssueSprintId: typeof newJiraIssueSprintId
    setNewJiraIssueSprintId: typeof setNewJiraIssueSprintId
    jiraCreatePriorities: typeof jiraCreatePriorities
    jiraCreateSprints: typeof jiraCreateSprints
  }
  nextModel.newJiraIssuePriorityId = newJiraIssuePriorityId
  nextModel.setNewJiraIssuePriorityId = setNewJiraIssuePriorityId
  nextModel.newJiraIssueAssignee = newJiraIssueAssignee
  nextModel.setNewJiraIssueAssignee = setNewJiraIssueAssignee
  nextModel.newJiraIssueSprintId = newJiraIssueSprintId
  nextModel.setNewJiraIssueSprintId = setNewJiraIssueSprintId
  nextModel.jiraCreatePriorities = jiraCreatePriorities
  nextModel.jiraCreateSprints = jiraCreateSprints
  return nextModel
}
