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
  const pct = Math.round((fulfilledConditions / totalConditions) * 100)
  const allDone = remaining === 0

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
        {`Progress on ${pactTitle}: ${fulfilledConditions} of ${totalConditions} conditions met`}
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
          {/* Header */}
          <Section
            style={{
              backgroundColor: '#131313',
              borderBottom: '2px solid #c3f400',
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
                color: '#c3f400',
                margin: '4px 0 0',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
              }}
            >
              CONDITION FULFILLED
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
              A condition has been fulfilled by{' '}
              <strong style={{ color: '#e5e2e1' }}>{fulfilledByName}</strong>.
            </Text>

            {/* Fulfilled condition */}
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
                ✓ FULFILLED
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#e5e2e1',
                  margin: 0,
                }}
              >
                {conditionTitle}
              </Text>
            </Section>

            {/* Progress */}
            <Section
              style={{
                backgroundColor: '#111111',
                border: '1px solid #2a2a2a',
                borderRadius: 6,
                padding: '16px 20px',
                marginBottom: 32,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: '#a1a1aa',
                  margin: '0 0 10px',
                }}
              >
                <strong style={{ color: '#e5e2e1' }}>
                  {fulfilledConditions} of {totalConditions}
                </strong>{' '}
                conditions met ({pct}%)
                {allDone
                  ? ' — all conditions fulfilled, pact executing!'
                  : ` — ${remaining} remaining`}
              </Text>
              {/* Progress bar */}
              <table
                cellPadding={0}
                cellSpacing={0}
                style={{
                  borderCollapse: 'collapse',
                  width: '100%',
                  backgroundColor: '#2a2a2a',
                  borderRadius: 999,
                  height: 6,
                  overflow: 'hidden',
                }}
              >
                <tbody>
                  <tr>
                    <td
                      style={{
                        width: `${pct}%`,
                        backgroundColor: allDone ? '#c3f400' : '#abd600',
                        height: 6,
                      }}
                    />
                    <td style={{ width: `${100 - pct}%`, height: 6 }} />
                  </tr>
                </tbody>
              </table>
            </Section>

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
                      backgroundColor: allDone ? '#c3f400' : '#1a1a1a',
                      border: allDone ? 'none' : '1px solid #444933',
                      borderRadius: 9999,
                      padding: '12px 28px',
                    }}
                  >
                    <a
                      href={pactUrl}
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: allDone ? '#0a0a0a' : '#c3f400',
                        textDecoration: 'none',
                        letterSpacing: '0.05em',
                        display: 'block',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      View Pact →
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
              You received this because you are a party to this Pact.
              <br />© Pact Protocol · Backed by Aurora DSQL
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
