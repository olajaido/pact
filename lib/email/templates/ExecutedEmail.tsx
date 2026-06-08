import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Hr,
  Preview,
} from '@react-email/components'

interface ExecutedEmailProps {
  pactTitle: string
  outcomeStatement: string
  executedAt: string
  receiptUrl: string
  executionHash: string
}

export function ExecutedEmail({
  pactTitle,
  outcomeStatement,
  executedAt,
  receiptUrl,
  executionHash,
}: ExecutedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Pact executed: {pactTitle}</Preview>
      <Body
        style={{
          fontFamily: 'Arial, sans-serif',
          background: '#F5F5F5',
          margin: 0,
          padding: 0,
        }}
      >
        <Container
          style={{
            maxWidth: 560,
            margin: '40px auto',
            background: '#FFFFFF',
            borderRadius: 8,
            padding: 32,
          }}
        >
          <div
            style={{
              background: '#22C55E',
              borderRadius: 6,
              padding: '16px 20px',
              marginBottom: 24,
            }}
          >
            <Heading style={{ color: '#0C0C0E', margin: 0, fontSize: 22 }}>
              PACT EXECUTED
            </Heading>
          </div>
          <Text style={{ fontSize: 18, fontWeight: 700, color: '#0C0C0E' }}>
            {pactTitle}
          </Text>
          <Text style={{ color: '#555' }}>
            <strong>Outcome achieved:</strong> {outcomeStatement}
          </Text>
          <Text style={{ color: '#555' }}>
            <strong>Executed at:</strong>{' '}
            {new Date(executedAt).toLocaleString()}
          </Text>
          <Hr style={{ borderColor: '#E5E5E5', margin: '20px 0' }} />
          <Text
            style={{
              color: '#999',
              fontSize: 12,
              fontFamily: 'monospace',
              wordBreak: 'break-all',
            }}
          >
            Execution hash: {executionHash}
          </Text>
          <Button
            href={receiptUrl}
            style={{
              display: 'inline-block',
              marginTop: 16,
              background: '#0C0C0E',
              color: '#D4FF4F',
              padding: '12px 24px',
              borderRadius: 6,
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: 14,
            }}
          >
            View Execution Receipt
          </Button>
          <Text style={{ color: '#999', fontSize: 12, marginTop: 32 }}>
            This record is tamper-evident. The execution hash above is the
            SHA-256 fingerprint of this Pact&apos;s execution.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
