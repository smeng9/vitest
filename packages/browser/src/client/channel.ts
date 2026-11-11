import type { CancelReason } from 'vitest'
import type { FileSpecification } from 'vitest/internal/browser'
import type { OTELCarrier } from 'vitest/internal/traces'
import { getBrowserState } from './utils'

export interface IframeViewportEvent {
  event: 'viewport'
  width: number
  height: number
  iframeId: string
}

export interface IframeViewportFailEvent {
  event: 'viewport:fail'
  iframeId: string
  error: string
}

export interface IframeViewportDoneEvent {
  event: 'viewport:done'
  iframeId: string
}

export interface IframeReadyEvent {
  event: 'ready'
  iframeId: string
}

/**
 * Posted by the tester when one of its module scripts fails to load.
 */
export interface IframeLoadErrorEvent {
  event: 'load-error'
  iframeId: string
  href: string
  url: string
}

/**
 * Posted by the tester when Vite re-optimized dependencies while the test file
 * was loading, so the file may run against a second copy of Vitest.
 */
export interface IframeStaleEvent {
  event: 'stale'
  iframeId: string
  href: string
}

export interface GlobalChannelTestRunCanceledEvent {
  type: 'cancel'
  reason: CancelReason
}

export interface IframeExecuteEvent {
  event: 'execute'
  method: 'run' | 'collect'
  files: FileSpecification[]
  iframeId: string
  context: string
  concurrencyId: number
  workerId: number
}

export interface IframeCleanupEvent {
  event: 'cleanup'
  iframeId: string
}

export interface IframePrepareEvent {
  event: 'prepare'
  iframeId: string
  startTime: number
  otelCarrier?: OTELCarrier
}

export type GlobalChannelIncomingEvent = GlobalChannelTestRunCanceledEvent

export type IframeChannelIncomingEvent =
  | IframeViewportEvent
  | IframeReadyEvent
  | IframeLoadErrorEvent
  | IframeStaleEvent

export type IframeChannelOutgoingEvent =
  | IframeExecuteEvent
  | IframeCleanupEvent
  | IframePrepareEvent
  | IframeViewportFailEvent
  | IframeViewportDoneEvent

export type IframeChannelEvent = IframeChannelIncomingEvent | IframeChannelOutgoingEvent

export type IframeReceivedEvent = IframeChannelEvent & { messageId: number }

export const channel: BroadcastChannel = new BroadcastChannel(
  `vitest:${getBrowserState().sessionId}`,
)
export const globalChannel: BroadcastChannel = new BroadcastChannel('vitest:global')
