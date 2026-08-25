/**
 * Trajectory: what an agent did, and what that says about it.
 *
 * The substrate several ideas were waiting on. Recovery asks whether the path is going
 * anywhere; risk analysis asks whether the path justified the act; handoff asks what the path
 * already ruled out; skill extraction asks which paths keep working. All four are questions
 * about the same recording.
 */
export * from './steps.js'
export * from './trajectory.js'
export * from './smells.js'
export * from './monitor.js'
export * from './otlp.js'
