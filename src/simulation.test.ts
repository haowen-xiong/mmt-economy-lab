import { describe, expect, it } from 'vitest'
import { runSimulation, scenarios, type EconomyPoint, type Policy } from './simulation'

const expectFinitePoint = (point: EconomyPoint) => {
  Object.entries(point).forEach(([key, value]) => {
    expect(Number.isFinite(value), `${key} should be finite`).toBe(true)
  })
}

const average = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length

describe('runSimulation', () => {
  it('produces a bounded finite time series for every scenario', () => {
    scenarios.forEach((scenario) => {
      const series = runSimulation(scenario.policy, 36)

      expect(series).toHaveLength(37)
      series.forEach((point, index) => {
        expect(point.period).toBe(index)
        expectFinitePoint(point)
        expect(point.identityResidual).toBeCloseTo(0, 8)
        expect(point.nominalGdp).toBeGreaterThan(0)
        expect(point.capacity).toBeGreaterThan(0)
        expect(point.priceIndex).toBeGreaterThan(0)
        expect(point.unemployment).toBeGreaterThanOrEqual(0)
      })
    })
  })

  it('keeps the three-sector balance identity closed', () => {
    const series = runSimulation(scenarios[0].policy, 72)

    series.forEach((point) => {
      expect(point.governmentBalance + point.privateBalance + point.foreignBalance).toBeCloseTo(0, 8)
    })
  })

  it('moves unemployment lower when the job guarantee is stronger', () => {
    const basePolicy = scenarios[0].policy
    const weakGuarantee: Policy = { ...basePolicy, jobGuarantee: 0 }
    const strongGuarantee: Policy = { ...basePolicy, jobGuarantee: 80 }

    const weakSeries = runSimulation(weakGuarantee, 24).slice(1)
    const strongSeries = runSimulation(strongGuarantee, 24).slice(1)

    const weakUnemployment = average(weakSeries.map((point) => point.unemployment))
    const strongUnemployment = average(strongSeries.map((point) => point.unemployment))

    expect(strongUnemployment).toBeLessThan(weakUnemployment)
  })
})
