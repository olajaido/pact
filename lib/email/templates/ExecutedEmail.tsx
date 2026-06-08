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
  const formattedDate = new Date(executedAt).toLocaleString('en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
  })

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
      <Preview>PACT EXECUTED: {pactTitle} — outcome achieved</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: '#0d0d0d' }}>
        <Container
          style={{
            maxWidth: 600,
            margin: '0 auto',
            backgroundColor: '#0d0d0d',
            fontFamily: 'Arial, Helvetica, sans-serif',
          }}
        >
          {/* Execution header — full lime */}
          <Section
            style={{
              backgroundColor: '#c3f400',
              padding: '24px 40px',
            }}
          >
            <Text
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 22,
                fontWeight: 700,
                color: '#0a0a0a',
                margin: '0 0 4px',
              }}
            >
              Pact Protocol
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#161e00',
                margin: 0,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
              }}
            >
              ✓ PACT EXECUTED
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
            {/* Pact title */}
            <Heading
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 28,
                fontWeight: 600,
                color: '#e5e2e1',
                margin: '0 0 8px',
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
              }}
            >
              {pactTitle}
            </Heading>
            <Text
              style={{
                fontSize: 13,
                color: '#a1a1aa',
                margin: '0 0 24px',
              }}
            >
              Executed on{' '}
              <strong style={{ color: '#c3f400' }}>{formattedDate}</strong>
            </Text>

            {/* Outcome */}
            <Section
              style={{
                backgroundColor: '#111111',
                borderLeft: '3px solid #c3f400',
                padding: '16px',
                marginBottom: 24,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#c3f400',
                  margin: '0 0 6px',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}
              >
                OUTCOME ACHIEVED
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  color: '#e5e2e1',
                  margin: 0,
                  lineHeight: 1.5,
                  fontWeight: 600,
                }}
              >
                {outcomeStatement}
              </Text>
            </Section>

            <Hr style={{ borderColor: '#2a2a2a', margin: '0 0 24px' }} />

            {/* Execution fingerprint */}
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
              EXECUTION FINGERPRINT
            </Text>
            <Section
              style={{
                backgroundColor: '#111111',
                border: '1px solid #2a2a2a',
                borderRadius: 4,
                padding: '12px 16px',
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontFamily: "'Courier New', Courier, monospace",
                  fontSize: 11,
                  color: '#c3f400',
                  margin: 0,
                  wordBreak: 'break-all',
                  lineHeight: 1.6,
                }}
              >
                {executionHash}
              </Text>
            </Section>
            <Text
              style={{
                fontSize: 11,
                color: '#52525b',
                margin: '0 0 32px',
                lineHeight: 1.5,
              }}
            >
              This SHA-256 hash is the immutable fingerprint of this execution.
              Each audit entry hashes the previous — tamper-evident by design.
            </Text>

            {/* CTA */}
            <table
              cellPadding={0}
              cellSpacing={0}
              style={{ borderCollapse: 'collapse' }}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      backgroundColor: '#c3f400',
                      borderRadius: 9999,
                      padding: '14px 32px',
                    }}
                  >
                    <a
                      href={receiptUrl}
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#0a0a0a',
                        textDecoration: 'none',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        display: 'block',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      View Execution Receipt →
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Footer */}
          <Section
            style={{
              backgroundColor: '#131313',
              borderTop: '1px solid #2a2a2a',
              padding: '20px 40px',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: '#52525b',
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              This is an official record of a Pact execution. The execution
              receipt at the link above is permanently accessible and
              tamper-evident.
              <br />
              <br />© Pact Protocol · Backed by Aurora DSQL · AWS × Vercel
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
