import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Preview,
  Font,
  Heading,
} from '@react-email/components'

interface DeclineEmailProps {
  pactTitle: string
  declinedByName: string
  declinedByEmail: string
  reason?: string
  pactId: string
  appUrl: string
}

export function DeclineEmail({
  pactTitle,
  declinedByName,
  declinedByEmail,
  reason,
  pactId,
  appUrl,
}: DeclineEmailProps) {
  return (
    <Html>
      <Head>
        <Font
          fontFamily="Playfair Display"
          fallbackFontFamily="Georgia"
          webFont={{
            url: 'https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKd3.woff2',
            format: 'woff2',
          }}
          fontWeight={600}
          fontStyle="normal"
        />
      </Head>
      <Preview>
        {declinedByName} declined the Pact: {pactTitle}
      </Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: '#0d0d0d' }}>
        <Container
          style={{
            maxWidth: 600,
            margin: '0 auto',
            backgroundColor: '#0d0d0d',
            fontFamily: 'Arial, Helvetica, sans-serif',
          }}
        >
          {/* Header — red-toned for decline */}
          <Section
            style={{
              backgroundColor: '#131313',
              borderBottom: '2px solid #ef4444',
              padding: '24px 40px',
            }}
          >
            <Text
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 22,
                fontWeight: 700,
                color: '#e5e2e1',
                margin: 0,
              }}
            >
              Pact Protocol
            </Text>
            <Text
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#ef4444',
                margin: '4px 0 0',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
              }}
            >
              PACT DECLINED
            </Text>
          </Section>

          {/* Body */}
          <Section
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #2a2a2a',
              padding: '40px',
            }}
          >
            <Heading
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 24,
                fontWeight: 600,
                color: '#e5e2e1',
                margin: '0 0 8px',
              }}
            >
              {pactTitle}
            </Heading>
            <Text
              style={{
                fontSize: 14,
                color: '#a1a1aa',
                margin: '0 0 24px',
              }}
            >
              This pact has been voided.
            </Text>

            {/* Who declined */}
            <Section
              style={{
                backgroundColor: '#111111',
                borderLeft: '3px solid #ef4444',
                padding: '16px',
                marginBottom: 24,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#ef4444',
                  margin: '0 0 8px',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}
              >
                DECLINED BY
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#e5e2e1',
                  margin: '0 0 4px',
                }}
              >
                {declinedByName}
              </Text>
              <Text style={{ fontSize: 13, color: '#a1a1aa', margin: 0 }}>
                {declinedByEmail}
              </Text>
            </Section>

            {/* Reason */}
            {reason && (
              <>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#a1a1aa',
                    margin: '0 0 8px',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                  }}
                >
                  REASON GIVEN
                </Text>
                <Section
                  style={{
                    backgroundColor: '#111111',
                    border: '1px solid #2a2a2a',
                    borderRadius: 6,
                    padding: '14px 16px',
                    marginBottom: 24,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: '#e5e2e1',
                      margin: 0,
                      lineHeight: 1.6,
                      fontStyle: 'italic',
                    }}
                  >
                    &quot;{reason}&quot;
                  </Text>
                </Section>
              </>
            )}

            <Hr style={{ borderColor: '#2a2a2a', margin: '0 0 20px' }} />

            <Text style={{ fontSize: 13, color: '#52525b', margin: 0, lineHeight: 1.6 }}>
              The full audit trail — including this decline and the reason — is permanently
              recorded in Aurora DSQL with a cryptographic hash chain.
              {' '}
              <a
                href={`${appUrl}/pacts/${pactId}`}
                style={{ color: '#c3f400', textDecoration: 'none' }}
              >
                View audit trail →
              </a>
            </Text>
          </Section>

          {/* Footer */}
          <Section
            style={{
              backgroundColor: '#131313',
              borderTop: '1px solid #2a2a2a',
              padding: '20px 40px',
            }}
          >
            <Text style={{ fontSize: 12, color: '#52525b', margin: 0, lineHeight: 1.6 }}>
              © Pact Protocol · Built on Aurora DSQL · AWS × Vercel
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
