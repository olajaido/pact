export type PactSSEEvent =
  | { type: 'CONNECTED' }
  | { type: 'PARTY_ACCEPTED'; partyId: string; timestamp: string }
  | { type: 'PACT_ACTIVATED'; timestamp: string }
  | { type: 'CONDITION_FULFILLED'; conditionId: string; timestamp: string }
  | { type: 'PACT_EXECUTED'; executedAt: string; executionHash: string }
  | { type: 'PACT_VOIDED'; timestamp: string }
  | { type: 'DISPUTE_RAISED'; raisedBy: string; reason: string; timestamp: string }
