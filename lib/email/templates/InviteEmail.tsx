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

interface InviteEmailProps {
  pactTitle: string
  creatorName: string
  outcomeStatement: string
  conditionTitle: string
  acceptUrl: string
}

export function InviteEmail({
  pactTitle,
  creatorName,
  outcomeStatement,
  conditionTitle,
  acceptUrl,
}: InviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {creatorName} invited you to a Pact: {pactTitle}
      </Preview>
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
          <Heading style={{ fontSize: 24, marginBottom: 8, color: '#0C0C0E' }}>
            You&apos;ve been invited to a Pact
          </Heading>
          <Text style={{ color: '#555', marginTop: 0 }}>
            <strong>{creatorName}</strong> has invited you to participate in:
          </Text>
          <Text style={{ fontSize: 18, fontWeight: 700, color: '#0C0C0E' }}>
            {pactTitle}
          </Text>
          <Text style={{ color: '#555' }}>
            <strong>Outcome:</strong> {outcomeStatement}
          </Text>
          <Hr style={{ borderColor: '#E5E5E5', margin: '20px 0' }} />
          <Text style={{ color: '#555' }}>
            <strong>Your obligation:</strong>
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
            {conditionTitle}
          </Text>
          <Button
            href={acceptUrl}
            style={{
              display: 'inline-block',
              marginTop: 24,
              background: '#0C0C0E',
              color: '#D4FF4F',
              padding: '12px 24px',
              borderRadius: 6,
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: 14,
            }}
          >
            Review and Accept
          </Button>
          <Text style={{ color: '#999', fontSize: 12, marginTop: 32 }}>
            Powered by Pact — programmable commitments.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
