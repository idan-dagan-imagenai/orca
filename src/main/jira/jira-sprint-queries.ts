import type { JiraProjectSprints, JiraSprint } from '../../shared/jira-types'
import { jiraRequest } from './authenticated-request'
import { clearToken, getClients, isAuthError } from './client'
import { getAgileFieldIds } from './jira-agile-fields'
import {
  asFiniteNumber,
  asRecord,
  asString,
  type JiraPagedResponse,
  type JiraRecord
} from './jira-record-pages'
import { acquire, release } from './request-queue'

// Why: Jira's own create dialog offers sprints from every board that includes the project.
const MAX_BOARDS = 5
const NO_SPRINTS: JiraProjectSprints = { sprintFieldId: null, sprints: [] }

export function mapSprints(records: readonly unknown[]): JiraSprint[] {
  const byId = new Map<number, JiraSprint>()
  for (const raw of records) {
    const record = asRecord(raw)
    const id = asFiniteNumber(record.id)
    const name = asString(record.name)
    if (id === null || !name || byId.has(id)) {
      continue
    }
    byId.set(id, { id, name, state: asString(record.state).toLowerCase() })
  }
  // Active sprints first, then future ones in board order.
  return [...byId.values()].sort(
    (a, b) => Number(b.state === 'active') - Number(a.state === 'active')
  )
}

export async function listProjectSprints(
  projectKey: string,
  siteId?: string | null
): Promise<JiraProjectSprints> {
  const entry = getClients(siteId)[0]
  if (!entry || !projectKey) {
    return NO_SPRINTS
  }
  // Discovery takes its own queue slot, so it runs before this call holds one.
  const sprintFieldId = (await getAgileFieldIds(entry)).sprint ?? null
  await acquire()
  try {
    const boardParams = new URLSearchParams({
      projectKeyOrId: projectKey,
      type: 'scrum',
      maxResults: String(MAX_BOARDS)
    })
    const boards = await jiraRequest<JiraPagedResponse<JiraRecord>>(
      entry,
      `/rest/agile/1.0/board?${boardParams.toString()}`
    )
    const records: unknown[] = []
    for (const board of boards.values ?? []) {
      const boardId = asFiniteNumber(asRecord(board).id)
      if (boardId === null) {
        continue
      }
      const sprints = await jiraRequest<JiraPagedResponse<JiraRecord>>(
        entry,
        `/rest/agile/1.0/board/${boardId}/sprint?state=active,future&maxResults=50`
      )
      records.push(...(sprints.values ?? []))
    }
    return { sprintFieldId, sprints: mapSprints(records) }
  } catch (error) {
    if (isAuthError(error)) {
      clearToken(entry.site.id)
      throw error
    }
    // Sprints are optional on create: a project without a Scrum board just hides the picker.
    console.warn('[jira] listProjectSprints failed:', error)
    return { sprintFieldId, sprints: [] }
  } finally {
    release()
  }
}
