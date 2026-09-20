import React, { useEffect, useMemo, useRef, useState } from 'react'
import { LoaderCircle } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { jiraSearchUsers } from '@/runtime/runtime-jira-client'
import { translate } from '@/i18n/i18n'
import type { GlobalSettings } from '../../../shared/global-settings-types'
import type { JiraUser } from '../../../shared/jira-types'
import type { TaskSourceContext } from '../../../shared/task-source-context'

const USER_SEARCH_DEBOUNCE_MS = 250

/** Case-insensitive match on name or email so a few typed letters narrow a long list. */
function filterJiraUsers(users: JiraUser[], query: string): JiraUser[] {
  const needle = query.trim().toLowerCase()
  if (!needle) {
    return users
  }
  return users.filter((user) =>
    `${user.displayName} ${user.email ?? ''}`.toLowerCase().includes(needle)
  )
}

/** Renders the selectable user rows inside the picker popover. */
export function JiraUserOptionList({
  users,
  onSelect,
  searchable = true,
  onSearch
}: {
  users: JiraUser[]
  onSelect: (user: JiraUser) => void
  /** Off when the caller already searches users server-side. */
  searchable?: boolean
  /**
   * Asks the server for matches. Jira returns only the first page of assignable
   * users, so filtering the loaded rows alone hides everyone past that cap.
   */
  onSearch?: (query: string) => Promise<JiraUser[]>
}): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [remote, setRemote] = useState<JiraUser[] | null>(null)
  const [searching, setSearching] = useState(false)
  // Why a ref: callers pass an inline closure, and depending on it would restart
  // the search on every render.
  const searchRef = useRef(onSearch)
  const canSearch = Boolean(onSearch)
  useEffect(() => {
    searchRef.current = onSearch
  })

  useEffect(() => {
    const needle = query.trim()
    if (!canSearch || !needle) {
      setRemote(null)
      setSearching(false)
      return
    }
    let cancelled = false
    setSearching(true)
    const timer = setTimeout(() => {
      const search = searchRef.current
      if (!search) {
        return
      }
      void search(needle)
        .then((found) => {
          if (!cancelled) {
            setRemote(found)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setRemote([])
          }
        })
        .finally(() => {
          if (!cancelled) {
            setSearching(false)
          }
        })
    }, USER_SEARCH_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [canSearch, query])

  // Server matches win once they land; until then the loaded rows narrow instantly.
  const filtered = useMemo(() => remote ?? filterJiraUsers(users, query), [remote, users, query])
  return (
    <>
      {searchable ? (
        // Why sticky: the popover scrolls, so a static filter leaves view exactly
        // when the list is long enough to need it.
        <div className="sticky top-0 z-10 mb-1 bg-popover">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={translate('components.jiraUserPicker.search', 'Search users')}
            className="h-7"
            autoFocus
          />
        </div>
      ) : null}
      {searchable && filtered.length === 0 && !searching ? (
        <p className="px-2 py-1.5 text-[12px] text-muted-foreground">
          {translate('components.jiraUserPicker.empty', 'No users found')}
        </p>
      ) : null}
      {filtered.map((user) => (
        <button
          key={user.accountId}
          type="button"
          onClick={() => onSelect(user)}
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12px] hover:bg-accent"
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="size-5 rounded-full" />
          ) : null}
          <span className="truncate">{user.displayName}</span>
        </button>
      ))}
    </>
  )
}

/**
 * Searchable single-user combobox for Jira user fields. These need an accountId,
 * not the display name a plain text box would collect, since Jira rejects a bare
 * string for user fields.
 */
export function JiraUserPicker({
  providerSettings,
  siteId,
  value,
  selectedUser,
  onSelect,
  disabled,
  label
}: {
  providerSettings: TaskSourceContext | GlobalSettings | null
  siteId?: string | null
  value: string
  selectedUser: JiraUser | null
  onSelect: (user: JiraUser) => void
  disabled?: boolean
  label: string
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<JiraUser[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(() => {
      void jiraSearchUsers(providerSettings, query, siteId)
        .then((found) => {
          if (!cancelled) {
            setUsers(found)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setUsers([])
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false)
          }
        })
    }, USER_SEARCH_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, providerSettings, query, siteId])

  const triggerLabel = useMemo(() => {
    if (selectedUser?.displayName) {
      return selectedUser.displayName
    }
    return (
      value ||
      translate('components.jiraUserPicker.select', 'Select {{value0}}', {
        value0: label
      })
    )
  }, [label, selectedUser, value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={label}
          className="flex h-8 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-2 text-left text-[12px] transition hover:bg-muted/40 disabled:opacity-50"
        >
          <span className={value ? 'truncate' : 'truncate text-muted-foreground'}>
            {triggerLabel}
          </span>
          {loading ? <LoaderCircle className="size-3 shrink-0 animate-spin" /> : null}
        </button>
      </PopoverTrigger>
      <PopoverContent className="popover-scroll-content scrollbar-sleek w-64 p-1" align="start">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={translate('components.jiraUserPicker.search', 'Search users')}
          className="mb-1 h-7 text-[12px]"
          autoFocus
        />
        {users.length === 0 && !loading ? (
          <p className="px-2 py-1.5 text-[12px] text-muted-foreground">
            {translate('components.jiraUserPicker.empty', 'No users found')}
          </p>
        ) : (
          <JiraUserOptionList
            users={users}
            searchable={false}
            onSelect={(user) => {
              onSelect(user)
              setOpen(false)
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}
