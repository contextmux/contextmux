import { describe, expect, it } from 'vitest'
import { bridgeLabel, parseBridgeLabel } from '../src/bridge.js'

describe('bridge label', () => {
  it('round-trips tracker and id', () => {
    const label = bridgeLabel('jira', 'PDC-6647')
    expect(label).toBe('bridged-from:jira:PDC-6647')
    expect(parseBridgeLabel([label])).toEqual({ tracker: 'jira', id: 'PDC-6647' })
  })

  it('finds it among unrelated labels', () => {
    expect(parseBridgeLabel(['bug', bridgeLabel('file', 'T-1'), 'contextmux'])).toEqual({
      tracker: 'file',
      id: 'T-1',
    })
  })

  it('returns null when there is no such label', () => {
    expect(parseBridgeLabel(['bug', 'contextmux'])).toBeNull()
    expect(parseBridgeLabel([])).toBeNull()
  })

  it('ignores a malformed marker rather than misreading it', () => {
    // No id after the second colon, and no tracker before it — both are unusable rather than
    // a tracker="" or id="" that would go on to be treated as a real one.
    expect(parseBridgeLabel(['bridged-from:jira'])).toBeNull()
    expect(parseBridgeLabel(['bridged-from::PDC-1'])).toBeNull()
  })
})
