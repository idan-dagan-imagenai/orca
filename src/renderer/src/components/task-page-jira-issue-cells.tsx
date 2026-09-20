import React, { useState } from 'react'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { JiraUserOptionList } from '@/components/jira-user-picker'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import type { JiraIssue, JiraPriority, JiraUser } from '../../../shared/jira-types'
import type { JiraInlineEditControls } from './use-task-page-jira-inline-edit'
import {
  formatJiraEstimate,
  formatJiraStoryPoints,
  type JiraListColumnId
} from './jira-list-columns'
import { getJiraPriorityTone } from './task-page-jira-status-tone'

const MUTED_CELL = 'block truncate text-[12px] text-muted-foreground'

export function noPriorityLabel(): string {
  return translate('auto.components.TaskPage.713179dfdc', 'No priority')
}

export function unassignedLabel(): string {
  return translate('auto.components.TaskPage.42a9160321', 'Unassigned')
}

export function JiraPriorityText({
  issue,
  className
}: {
  issue: JiraIssue
  className?: string
}): React.JSX.Element {
  return (
    <span className={cn(getJiraPriorityTone(issue.priority?.name), className)}>
      {issue.priority?.name ?? noPriorityLabel()}
    </span>
  )
}

function ParentCell({ issue }: { issue: JiraIssue }): React.JSX.Element {
  if (!issue.parent) {
    return <span className={MUTED_CELL}>–</span>
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-muted-foreground">
          <span className="shrink-0 rounded-sm border border-primary/30 bg-primary/10 px-1 font-mono text-[10px] text-primary">
            {issue.parent.key}
          </span>
          <span className="truncate">{issue.parent.title}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {issue.parent.issueTypeName ? `${issue.parent.issueTypeName}: ` : ''}
        {issue.parent.title}
      </TooltipContent>
    </Tooltip>
  )
}

function AssigneeAvatarName({ issue }: { issue: JiraIssue }): React.JSX.Element {
  return (
    <>
      {issue.assignee?.avatarUrl ? (
        <img
          src={issue.assignee.avatarUrl}
          alt={issue.assignee.displayName}
          className="size-5 shrink-0 rounded-full"
        />
      ) : (
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border/50 bg-muted/40 text-[10px]">
          {issue.assignee?.displayName?.slice(0, 1) ?? '-'}
        </span>
      )}
      <span className="truncate">{issue.assignee?.displayName ?? unassignedLabel()}</span>
    </>
  )
}

const ASSIGNEE_CELL = 'flex min-w-0 items-center gap-2 text-[12px] text-muted-foreground'
const OPTION_BUTTON =
  'flex w-full items-center rounded-sm px-2 py-1.5 text-left text-[12px] hover:bg-accent'

/**
 * Popover shell for an editable cell: the trigger swallows the row click, options
 * load once on first open, and `children` renders them (or a loading line).
 */
function EditableCell<T>({
  load,
  trigger,
  triggerClassName,
  children
}: {
  load: () => Promise<T[]>
  trigger: React.ReactNode
  triggerClassName: string
  children: (options: T[], close: () => void) => React.ReactNode
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<T[] | null>(null)
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next && options === null) {
          load().then(setOptions, () => setOptions([]))
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(event) => event.stopPropagation()}
          className={cn(triggerClassName, 'rounded-md hover:bg-muted/40')}
        >
          {trigger}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="start" onClick={(event) => event.stopPropagation()}>
        {options === null ? (
          <p className="px-2 py-1.5 text-[12px] text-muted-foreground">
            {translate('auto.components.TaskPage.jiraOptionsLoading', 'Loading…')}
          </p>
        ) : (
          children(options, () => setOpen(false))
        )}
      </PopoverContent>
    </Popover>
  )
}

/** Clicking the assignee opens an inline picker instead of the issue detail. */
function AssigneeCell({
  issue,
  controls
}: {
  issue: JiraIssue
  controls: JiraInlineEditControls
}): React.JSX.Element {
  const choose = (close: () => void, user: JiraUser | null): void => {
    close()
    void controls.update(
      issue,
      { assigneeAccountId: user?.accountId ?? null },
      { assignee: user ?? undefined }
    )
  }
  return (
    <EditableCell
      load={() => controls.listUsers(issue)}
      trigger={<AssigneeAvatarName issue={issue} />}
      triggerClassName={cn(ASSIGNEE_CELL, 'w-full px-1 py-0.5')}
    >
      {(users, close) => (
        <>
          <button type="button" onClick={() => choose(close, null)} className={OPTION_BUTTON}>
            {unassignedLabel()}
          </button>
          <JiraUserOptionList users={users} onSelect={(user) => choose(close, user)} />
        </>
      )}
    </EditableCell>
  )
}

function PriorityCell({
  issue,
  controls
}: {
  issue: JiraIssue
  controls: JiraInlineEditControls
}): React.JSX.Element {
  const choose = (close: () => void, priority: JiraPriority | null): void => {
    close()
    void controls.update(
      issue,
      { priorityId: priority?.id ?? null },
      { priority: priority ?? undefined }
    )
  }
  return (
    <EditableCell
      load={() => controls.listPriorities(issue)}
      trigger={<JiraPriorityText issue={issue} className="block truncate text-[12px]" />}
      triggerClassName="block w-full px-1 py-0.5 text-left"
    >
      {(priorities, close) => (
        <>
          <button type="button" onClick={() => choose(close, null)} className={OPTION_BUTTON}>
            {noPriorityLabel()}
          </button>
          {priorities.map((priority) => (
            <button
              key={priority.id}
              type="button"
              onClick={() => choose(close, priority)}
              className={cn(OPTION_BUTTON, getJiraPriorityTone(priority.name))}
            >
              {priority.name}
            </button>
          ))}
        </>
      )}
    </EditableCell>
  )
}

function StatusBadge({
  issue,
  getStatusTone
}: {
  issue: JiraIssue
  getStatusTone: (categoryKey: string) => string
}): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
        getStatusTone(issue.status.categoryKey)
      )}
    >
      <span className="truncate">{issue.status.name}</span>
    </span>
  )
}

/** Status changes go through the issue's workflow transitions, so options are per issue. */
function StatusCell({
  issue,
  controls,
  getStatusTone
}: {
  issue: JiraIssue
  controls: JiraInlineEditControls
  getStatusTone: (categoryKey: string) => string
}): React.JSX.Element {
  return (
    <EditableCell
      load={() => controls.listTransitions(issue)}
      trigger={<StatusBadge issue={issue} getStatusTone={getStatusTone} />}
      triggerClassName="flex min-w-0 max-w-full px-1 py-0.5"
    >
      {(transitions, close) =>
        transitions.length === 0 ? (
          <p className="px-2 py-1.5 text-[12px] text-muted-foreground">
            {translate('auto.components.TaskPage.jiraNoTransitions', 'No transitions available')}
          </p>
        ) : (
          transitions.map((transition) => (
            <button
              key={transition.id}
              type="button"
              onClick={() => {
                close()
                void controls.update(
                  issue,
                  { transitionId: transition.id },
                  { status: transition.to }
                )
              }}
              className={OPTION_BUTTON}
            >
              {transition.name}
            </button>
          ))
        )
      }
    </EditableCell>
  )
}

/** Desktop cell for every column except `key` and `title`, which the row renders itself. */
export function JiraIssueCell({
  column,
  issue,
  formatUpdatedAt,
  getStatusTone,
  editControls
}: {
  column: JiraListColumnId
  issue: JiraIssue
  formatUpdatedAt: (updatedAt: string) => string
  getStatusTone: (categoryKey: string) => string
  editControls?: JiraInlineEditControls
}): React.JSX.Element | null {
  switch (column) {
    case 'status':
      return (
        <div className="flex min-w-0">
          {editControls ? (
            <StatusCell issue={issue} controls={editControls} getStatusTone={getStatusTone} />
          ) : (
            <StatusBadge issue={issue} getStatusTone={getStatusTone} />
          )}
        </div>
      )
    case 'priority':
      return editControls ? (
        <PriorityCell issue={issue} controls={editControls} />
      ) : (
        <JiraPriorityText issue={issue} className="block truncate text-[12px]" />
      )
    case 'assignee':
      return editControls ? (
        <AssigneeCell issue={issue} controls={editControls} />
      ) : (
        <div className={ASSIGNEE_CELL}>
          <AssigneeAvatarName issue={issue} />
        </div>
      )
    case 'parent':
      return <ParentCell issue={issue} />
    case 'sprint':
      return <span className={MUTED_CELL}>{issue.sprint ?? '–'}</span>
    case 'storyPoints':
      return (
        <span className={cn(MUTED_CELL, 'tabular-nums')}>
          {formatJiraStoryPoints(issue.storyPoints)}
        </span>
      )
    case 'originalEstimate':
      return (
        <span className={cn(MUTED_CELL, 'tabular-nums')}>
          {formatJiraEstimate(issue.originalEstimateSeconds)}
        </span>
      )
    case 'remainingEstimate':
      return (
        <span className={cn(MUTED_CELL, 'tabular-nums')}>
          {formatJiraEstimate(issue.remainingEstimateSeconds)}
        </span>
      )
    case 'updated':
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="block min-w-0 truncate text-[12px] text-muted-foreground">
              {formatUpdatedAt(issue.updatedAt)}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            {new Date(issue.updatedAt).toLocaleString()}
          </TooltipContent>
        </Tooltip>
      )
    case 'key':
    case 'title':
      return null
  }
}
