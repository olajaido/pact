import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Preview,
  Font,
  Heading,
} from '@react-email/components'

interface MagicLinkEmailProps {
  url: string
  email: string
}

export function MagicLinkEmail({ url, email }: MagicLinkEmailProps) {
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
      <Preview>Sign in to Pact Protocol — your magic link is inside</Preview>
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
                fontSize: 24,
                fontWeight: 700,
                color: '#e5e2e1',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Pact Protocol
            </Text>
            <Text
              style={{
                fontFamily: 'Arial, sans-serif',
                fontSize: 10,
                fontWeight: 700,
                color: '#c3f400',
                margin: '4px 0 0',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
              }}
            >
              VERIFIED LEGAL NODE
            </Text>
          </Section>

          {/* Body */}
          <Section
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #2a2a2a',
              padding: '48px 40px',
            }}
          >
            <Heading
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 32,
                fontWeight: 600,
                color: '#e5e2e1',
                margin: '0 0 16px',
                letterSpacing: '-0.01em',
              }}
            >
              Sign in to Pact
            </Heading>
            <Text
              style={{
                fontFamily: 'Arial, sans-serif',
                fontSize: 16,
                color: '#a1a1aa',
                lineHeight: 1.6,
                margin: '0 0 32px',
              }}
            >
              Click the button below to sign in as{' '}
              <span style={{ color: '#e5e2e1' }}>{email}</span>. This link
              expires in <strong style={{ color: '#c3f400' }}>10 minutes</strong>.
            </Text>

            {/* CTA Button — table-based for email client compatibility */}
            <table
              cellPadding={0}
              cellSpacing={0}
              style={{ borderCollapse: 'collapse', margin: '0 0 32px' }}
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
                      href={url}
                      style={{
                        fontFamily: 'Arial, sans-serif',
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#0a0a0a',
                        textDecoration: 'none',
                        letterSpacing: '0.05em',
                        display: 'block',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Sign in to Pact Protocol →
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>

            <Hr style={{ borderColor: '#2a2a2a', margin: '0 0 24px' }} />

            <Text
              style={{
                fontFamily: 'Arial, sans-serif',
                fontSize: 12,
                color: '#52525b',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              If the button above does not work, copy and paste this URL into
              your browser:
              <br />
              <span style={{ color: '#c3f400', wordBreak: 'break-all' }}>{url}</span>
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
            <Text
              style={{
                fontFamily: 'Arial, sans-serif',
                fontSize: 12,
                color: '#52525b',
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              If you did not request this email, you can safely ignore it.
              This link can only be used once.
              <br />
              <br />© Pact Protocol · Built on Aurora DSQL · AWS × Vercel
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
