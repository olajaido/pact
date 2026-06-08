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

interface FulfilledEmailProps {
  pactTitle: string
  conditionTitle: string
  fulfilledByName: string
  totalConditions: number
  fulfilledConditions: number
  pactUrl: string
}

export function FulfilledEmail({
  pactTitle,
  conditionTitle,
  fulfilledByName,
  totalConditions,
  fulfilledConditions,
  pactUrl,
}: FulfilledEmailProps) {
  const remaining = totalConditions - fulfilledConditions

  return (
    <Html>
      <Head />
      <Preview>Progress update on {pactTitle}</Preview>
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
          <Heading style={{ fontSize: 22, marginBottom: 8, color: '#0C0C0E' }}>
            A condition has been fulfilled
          </Heading>
          <Text style={{ color: '#555', marginTop: 0 }}>
            On <strong>{pactTitle}</strong>:
          </Text>
          <Text
            style={{
              background: '#F9F9F9',
              padding: '12px 16px',
              borderRadius: 6,
              borderLeft: '3px solid #22C55E',
              color: '#0C0C0E',
            }}
          >
            <strong>{conditionTitle}</strong>
            <br />
            <span style={{ fontSize: 13, color: '#555' }}>
              Fulfilled by {fulfilledByName}
            </span>
          </Text>
          <Text style={{ color: '#555' }}>
            Progress:{' '}
            <strong>
              {fulfilledConditions} of {totalConditions}
            </strong>{' '}
            conditions met.
            {remaining > 0
              ? ` ${remaining} remaining.`
              : ' All conditions are now fulfilled.'}
          </Text>
          <Hr style={{ borderColor: '#E5E5E5', margin: '20px 0' }} />
          <Button
            href={pactUrl}
            style={{
              display: 'inline-block',
              background: '#0C0C0E',
              color: '#D4FF4F',
              padding: '12px 24px',
              borderRadius: 6,
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: 14,
            }}
          >
            View Pact
          </Button>
        </Container>
      </Body>
    </Html>
  )
}
