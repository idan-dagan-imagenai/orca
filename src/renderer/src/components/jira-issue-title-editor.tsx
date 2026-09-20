import React, { useState } from 'react'
import { Pencil } from 'lucide-react'

import { translate } from '@/i18n/i18n'
import type { JiraIssue } from '../../../shared/jira-types'
import type { JiraInlineEditControls } from './use-task-page-jira-inline-edit'

/** Row title that turns into an input from the hover pencil; Enter saves, Escape cancels. */
export function EditableTitle({
  issue,
  controls
}: {
  issue: JiraIssue
  controls?: JiraInlineEditControls
}): React.JSX.Element {
  const [draft, setDraft] = useState<string | null>(null)
  if (draft === null || !controls) {
    return (
      <>
        <h3 className="min-w-0 truncate text-[13px] font-medium text-foreground">{issue.title}</h3>
        {controls ? (
          <button
            type="button"
            aria-label={translate('auto.components.TaskPage.jiraEditTitle', 'Edit title')}
            onClick={(event) => {
              event.stopPropagation()
              setDraft(issue.title)
            }}
            className="shrink-0 rounded-sm p-0.5 text-muted-foreground opacity-0 transition hover:bg-muted/40 hover:text-foreground focus-visible:opacity-100 group-hover/row:opacity-100"
          >
            <Pencil className="size-3" />
          </button>
        ) : null}
      </>
    )
  }
  const save = (): void => {
    const title = draft.trim()
    setDraft(null)
    if (title && title !== issue.title) {
      void controls.update(issue, { title }, { title })
    }
  }
  return (
    <input
      autoFocus
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onBlur={save}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Enter') {
          save()
        } else if (event.key === 'Escape') {
          setDraft(null)
        }
      }}
      className="min-w-0 flex-1 rounded-sm border border-border bg-background px-1 py-0.5 text-[13px] font-medium text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
    />
  )
}
