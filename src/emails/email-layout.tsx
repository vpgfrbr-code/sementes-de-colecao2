import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";

export interface EmailBranding {
  mode: "image" | "text";
  brandName: string;
  /** Absolute URL to the brand logo. Used in image mode. */
  logoUrl: string;
  /** Absolute URL to the public site root, used for the logo link and footer. */
  siteUrl: string;
}

const FALLBACK_BRANDING: EmailBranding = {
  mode: "image",
  brandName: "Sementes de Coleção",
  logoUrl: "https://sementesdecolecao.com/logo.svg",
  siteUrl: "https://sementesdecolecao.com",
};

// Defensive CSS for email clients that force dark mode (Gmail mobile, etc.).
// Most clients honor the `color-scheme: light only` meta and skip inversion;
// this block re-asserts brand colors for the ones that invert anyway.
const DARK_MODE_OVERRIDES = `
  :root {
    color-scheme: light only;
    supported-color-schemes: light only;
  }
  @media (prefers-color-scheme: dark) {
    .email-body { background-color: #faf8f5 !important; }
    .email-card { background-color: #ffffff !important; }
    .email-heading { color: #2d4a2e !important; }
    .email-text { color: #3c3c43 !important; }
    .email-muted { color: #6b6b6b !important; }
    .email-footer-muted { color: #8a8275 !important; }
    .email-brand { color: #2d4a2e !important; }
    .email-divider { border-color: #e8e2d9 !important; }
  }
  /* Outlook.com / Office 365 dark-mode overrides */
  [data-ogsc] .email-body { background-color: #faf8f5 !important; }
  [data-ogsc] .email-card { background-color: #ffffff !important; }
  [data-ogsc] .email-heading { color: #2d4a2e !important; }
  [data-ogsc] .email-text { color: #3c3c43 !important; }
  [data-ogsc] .email-muted { color: #6b6b6b !important; }
  [data-ogsc] .email-footer-muted { color: #8a8275 !important; }
  [data-ogsc] .email-brand { color: #2d4a2e !important; }
  [data-ogsc] .email-divider { border-color: #e8e2d9 !important; }
  [data-ogsb] .email-body { background-color: #faf8f5 !important; }
  [data-ogsb] .email-card { background-color: #ffffff !important; }
`;

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
  branding?: EmailBranding;
}

export function EmailLayout({ preview, children, branding }: EmailLayoutProps) {
  const b = branding ?? FALLBACK_BRANDING;
  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light only" />
        <style
          // Embedded CSS is required for @media / attribute-selector overrides
          // that inline styles cannot express.
          dangerouslySetInnerHTML={{ __html: DARK_MODE_OVERRIDES }}
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body
        className="email-body"
        style={{
          fontFamily:
            "'Space Grotesk', 'Helvetica Neue', Helvetica, Arial, sans-serif",
          backgroundColor: "#faf8f5",
          margin: 0,
          padding: "40px 0",
        }}
      >
        <Container
          className="email-card"
          style={{
            maxWidth: "520px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            padding: "40px 32px",
          }}
        >
          {/* Logo header */}
          <Section style={{ textAlign: "center" as const, marginBottom: "32px" }}>
            <Link href={b.siteUrl} style={{ display: "inline-block" }}>
              {b.mode === "text" ? (
                <Text
                  className="email-brand"
                  style={{
                    fontSize: "28px",
                    fontWeight: 700,
                    color: "#2d4a2e",
                    margin: 0,
                    letterSpacing: "-0.01em",
                    textDecoration: "none",
                  }}
                >
                  {b.brandName}
                </Text>
              ) : (
                <Img
                  src={b.logoUrl}
                  alt={b.brandName}
                  width="160"
                  height="63"
                  style={{ margin: "0 auto" }}
                />
              )}
            </Link>
          </Section>

          {children}

          {/* Footer */}
          <Hr
            className="email-divider"
            style={{ borderColor: "#e8e2d9", margin: "32px 0 24px" }}
          />

          <Section style={{ textAlign: "center" as const }}>
            <Text
              className="email-footer-muted"
              style={{
                fontFamily: "'Space Mono', 'Courier New', monospace",
                fontSize: "8px",
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.25em",
                color: "#8a8275",
                margin: "0 0 12px",
              }}
            >
              {b.brandName}
            </Text>

            <Text
              className="email-muted"
              style={{
                fontSize: "12px",
                lineHeight: "20px",
                color: "#6b6b6b",
                margin: "0 0 8px",
              }}
            >
              <Link
                href={b.siteUrl}
                className="email-brand"
                style={{
                  color: "#2d4a2e",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                {b.siteUrl.replace(/^https?:\/\//, "")}
              </Link>
              {" · "}
              <Link
                href="https://instagram.com/sementesdecolecao"
                className="email-muted"
                style={{
                  color: "#6b6b6b",
                  textDecoration: "none",
                }}
              >
                @sementesdecolecao
              </Link>
            </Text>

            <Text
              className="email-footer-muted"
              style={{
                fontFamily: "'Space Mono', 'Courier New', monospace",
                fontSize: "10px",
                color: "#8a8275",
                margin: 0,
              }}
            >
              &copy; {new Date().getFullYear()} {b.brandName}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
