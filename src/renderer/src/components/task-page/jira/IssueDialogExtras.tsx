import React from 'react'
import type { TaskPageComposerActionsModel } from '../../use-task-page-composer-actions'
import { JiraUserPicker } from '@/components/jira-user-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { translate } from '@/i18n/i18n'

// Why: Radix Select rejects an empty item value, so "no choice" needs its own token.
const NONE = 'none'

/** Optional priority, assignee and sprint pickers under the description field. */
export function TaskPageJiraIssueDialogExtras({
  model
}: {
  model: TaskPageComposerActionsModel
}): React.JSX.Element {
  const {
    settings,
    jiraTaskSourceContext,
    newJiraIssueSubmitting,
    newJiraIssueTargetProject,
    newJiraIssuePriorityId,
    setNewJiraIssuePriorityId,
    newJiraIssueAssignee,
    setNewJiraIssueAssignee,
    newJiraIssueSprintId,
    setNewJiraIssueSprintId,
    jiraCreatePriorities,
    jiraCreateSprints
  } = model
  const noneLabel = translate('auto.components.TaskPage.jiraCreateNone', 'None')
  const assigneeLabel = translate('auto.components.TaskPage.jiraCreateAssignee', 'Assignee')
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {jiraCreatePriorities.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">
            {translate('auto.components.TaskPage.jiraCreatePriority', 'Priority')}
          </label>
          <Select
            value={newJiraIssuePriorityId ?? NONE}
            onValueChange={(value) => setNewJiraIssuePriorityId(value === NONE ? null : value)}
            disabled={newJiraIssueSubmitting}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{noneLabel}</SelectItem>
              {jiraCreatePriorities.map((priority) => (
                <SelectItem key={priority.id} value={priority.id}>
                  {priority.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-col gap-1">
        <label className="text-[11px] font-medium text-muted-foreground">{assigneeLabel}</label>
        <JiraUserPicker
          providerSettings={jiraTaskSourceContext ?? settings}
          siteId={newJiraIssueTargetProject?.siteId}
          value={newJiraIssueAssignee?.displayName ?? ''}
          selectedUser={newJiraIssueAssignee}
          onSelect={setNewJiraIssueAssignee}
          disabled={newJiraIssueSubmitting}
          label={assigneeLabel}
        />
      </div>
      {jiraCreateSprints.sprintFieldId && jiraCreateSprints.sprints.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">
            {translate('auto.components.TaskPage.jiraCreateSprint', 'Sprint')}
          </label>
          <Select
            value={newJiraIssueSprintId ?? NONE}
            onValueChange={(value) => setNewJiraIssueSprintId(value === NONE ? null : value)}
            disabled={newJiraIssueSubmitting}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{noneLabel}</SelectItem>
              {jiraCreateSprints.sprints.map((sprint) => (
                <SelectItem key={sprint.id} value={String(sprint.id)}>
                  {sprint.state === 'active'
                    ? translate(
                        'auto.components.TaskPage.jiraCreateSprintActive',
                        '{{value0}} (active)',
                        { value0: sprint.name }
                      )
                    : sprint.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  )
}
