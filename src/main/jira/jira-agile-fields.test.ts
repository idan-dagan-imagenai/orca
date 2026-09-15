import { describe, expect, it } from 'vitest'
import { pickAgileFieldIds } from './jira-agile-fields'
import { mapJiraIssue, mapSprint } from './jira-issue-mapping'
import type { JiraSite } from '../../shared/jira-types'

const site = {
  id: 'site',
  displayName: 'Site',
  siteUrl: 'https://example.atlassian.net',
  authType: 'cloud'
} as unknown as JiraSite

describe('jira agile fields', () => {
  it('picks sprint and story point custom field ids from the field catalog', () => {
    expect(
      pickAgileFieldIds([
        {
          id: 'customfield_1',
          name: 'Sprint',
          schema: { custom: 'com.pyxis.greenhopper.jira:gh-sprint' }
        },
        {
          id: 'customfield_2',
          name: 'Budget',
          schema: { custom: 'com.atlassian.jira.plugin.system.customfieldtypes:float' }
        },
        {
          id: 'customfield_3',
          name: 'Story Points',
          schema: { custom: 'com.atlassian.jira.plugin.system.customfieldtypes:float' }
        }
      ])
    ).toEqual({ sprint: 'customfield_1', storyPoints: 'customfield_3' })
  })

  it('prefers the active sprint and parses Server sprint strings', () => {
    expect(
      mapSprint([
        { name: 'Sprint 1', state: 'closed' },
        { name: 'Sprint 2', state: 'active' },
        { name: 'Sprint 3', state: 'future' }
      ])
    ).toBe('Sprint 2')
    expect(
      mapSprint([
        'com.atlassian.greenhopper.service.sprint.Sprint@1[id=4,state=ACTIVE,name=Sprint 4,goal=]'
      ])
    ).toBe('Sprint 4')
    expect(mapSprint(null)).toBeUndefined()
  })

  it('maps parent, estimates and agile custom fields onto the issue', () => {
    const issue = mapJiraIssue(
      site,
      {
        id: '1',
        key: 'ALP-1',
        fields: {
          summary: 'Story',
          parent: { key: 'ALP-9', fields: { summary: 'Big epic', issuetype: { name: 'Epic' } } },
          timeoriginalestimate: 7200,
          timeestimate: 3600,
          customfield_1: [{ name: 'Sprint 2', state: 'active' }],
          customfield_3: 5
        }
      },
      undefined,
      { sprint: 'customfield_1', storyPoints: 'customfield_3' }
    )
    expect(issue.parent).toEqual({ key: 'ALP-9', title: 'Big epic', issueTypeName: 'Epic' })
    expect(issue.originalEstimateSeconds).toBe(7200)
    expect(issue.remainingEstimateSeconds).toBe(3600)
    expect(issue.sprint).toBe('Sprint 2')
    expect(issue.storyPoints).toBe(5)
  })
})
