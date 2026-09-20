import React, { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { JiraUserOptionList } from '@/components/jira-user-picker'
import { translate } from '@/i18n/i18n'
import type { JiraIssue, JiraIssueUpdate, JiraSprint, JiraUser } from '../../../shared/jira-types'
import type { JiraInlineEditControls } from './use-task-page-jira-inline-edit'

const FIELD_TRIGGER =
  'flex h-8 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-2 text-left text-[12px] transition hover:bg-muted/40 disabled:opacity-50'
const OPTION_BUTTON =
  'flex w-full items-center rounded-sm px-2 py-1.5 text-left text-[12px] hover:bg-accent'

function backlogLabel(): string {
  return translate('components.jiraQuickEdit.backlog', 'Backlog')
}

function unassignedLabel(): string {
  return translate('components.jiraQuickEdit.unassigned', 'Unassigned')
}

function sprintLabel(sprint: JiraSprint): string {
  return sprint.state === 'active'
    ? translate('components.jiraQuickEdit.sprintActive', '{{value0}} (active)', {
        value0: sprint.name
      })
    : sprint.name
}

/**
 * Batched sprint + assignee edit for one issue. Nothing reaches Jira until submit,
 * so both fields move together and a mistaken pick costs a cancel rather than a revert.
 */
export function JiraIssueQuickEditDialog({
  issue,
  controls,
  open,
  onOpenChange
}: {
  issue: JiraIssue | null
  controls: JiraInlineEditControls
  open: boolean
  onOpenChange: (open: boolean) => void
}): React.JSX.Element | null {
  const [sprints, setSprints] = useState<JiraSprint[] | null>(null)
  const [users, setUsers] = useState<JiraUser[] | null>(null)
  const [sprint, setSprint] = useState<JiraSprint | null>(null)
  const [assignee, setAssignee] = useState<JiraUser | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sprintOpen, setSprintOpen] = useState(false)
  const [assigneeOpen, setAssigneeOpen] = useState(false)

  useEffect(() => {
    if (!open || !issue) {
      return
    }
    let cancelled = false
    setSprints(null)
    setUsers(null)
    setAssignee(issue.assignee ?? null)
    setSprint(null)
    void controls.listSprints(issue).then(
      (found) => {
        if (cancelled) {
          return
        }
        setSprints(found)
        // The issue carries the sprint name, not its id, so the current pick is matched back.
        setSprint(found.find((candidate) => candidate.name === issue.sprint) ?? null)
      },
      () => {
        if (!cancelled) {
          setSprints([])
        }
      }
    )
    void controls.listUsers(issue).then(
      (found) => {
        if (!cancelled) {
          setUsers(found)
        }
      },
      () => {
        if (!cancelled) {
          setUsers([])
        }
      }
    )
    return () => {
      cancelled = true
    }
  }, [controls, issue, open])

  if (!issue) {
    return null
  }

  const submit = async (): Promise<void> => {
    const updates: JiraIssueUpdate = {}
    const optimistic: Partial<JiraIssue> = {}
    if ((sprint?.name ?? undefined) !== issue.sprint) {
      updates.sprintId = sprint?.id ?? null
      optimistic.sprint = sprint?.name ?? undefined
    }
    if ((assignee?.accountId ?? null) !== (issue.assignee?.accountId ?? null)) {
      updates.assigneeAccountId = assignee?.accountId ?? null
      optimistic.assignee = assignee ?? undefined
    }
    if (Object.keys(updates).length === 0) {
      onOpenChange(false)
      return
    }
    setSubmitting(true)
    try {
      await controls.update(issue, updates, optimistic)
    } finally {
      setSubmitting(false)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{issue.key}</DialogTitle>
          <DialogDescription>{issue.title}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
          <span className="text-[12px] text-muted-foreground">
            {translate('components.jiraQuickEdit.sprint', 'Sprint')}
          </span>
          <Popover open={sprintOpen} onOpenChange={setSprintOpen}>
            <PopoverTrigger asChild>
              <button type="button" className={FIELD_TRIGGER} disabled={submitting}>
                <span className="truncate">{sprint ? sprintLabel(sprint) : backlogLabel()}</span>
                {sprints === null ? <LoaderCircle className="size-3 animate-spin" /> : null}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="start">
              <div className="popover-scroll-content scrollbar-sleek">
                <button
                  type="button"
                  onClick={() => {
                    setSprint(null)
                    setSprintOpen(false)
                  }}
                  className={OPTION_BUTTON}
                >
                  {backlogLabel()}
                </button>
                {(sprints ?? []).map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => {
                      setSprint(candidate)
                      setSprintOpen(false)
                    }}
                    className={OPTION_BUTTON}
                  >
                    {sprintLabel(candidate)}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <span className="text-[12px] text-muted-foreground">
            {translate('components.jiraQuickEdit.assignee', 'Assignee')}
          </span>
          <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
            <PopoverTrigger asChild>
              <button type="button" className={FIELD_TRIGGER} disabled={submitting}>
                <span className="truncate">{assignee?.displayName ?? unassignedLabel()}</span>
                {users === null ? <LoaderCircle className="size-3 animate-spin" /> : null}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="start">
              <div className="popover-scroll-content scrollbar-sleek">
                <button
                  type="button"
                  onClick={() => {
                    setAssignee(null)
                    setAssigneeOpen(false)
                  }}
                  className={OPTION_BUTTON}
                >
                  {unassignedLabel()}
                </button>
                <JiraUserOptionList
                  users={users ?? []}
                  onSearch={(query) => controls.searchUsers(issue, query)}
                  onSelect={(user) => {
                    setAssignee(user)
                    setAssigneeOpen(false)
                  }}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            {translate('components.jiraQuickEdit.cancel', 'Cancel')}
          </Button>
          <Button onClick={() => void submit()} disabled={submitting}>
            {submitting ? <LoaderCircle className="size-3 animate-spin" /> : null}
            {translate('components.jiraQuickEdit.submit', 'Submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
