import {
  Heading,
  Text,
  Section,
  Hr,
  Link,
} from "@react-email/components";
import { EmailLayout, type EmailBranding } from "./email-layout";

interface OrderShippedEmailProps {
  orderId: string;
  trackingCode: string;
  shippingCarrier?: string | null;
  orderUrl: string;
  branding?: EmailBranding;
}

export function OrderShippedEmail({
  orderId,
  trackingCode,
  shippingCarrier,
  orderUrl,
  branding,
}: OrderShippedEmailProps) {
  return (
    <EmailLayout
      preview="Seu pedido foi enviado! - SementesDeColecao.com"
      branding={branding}
    >
      <Heading
        className="email-heading"
        style={{
          fontSize: "24px",
          fontWeight: 700,
          color: "#2d4a2e",
          margin: "0 0 16px",
        }}
      >
        Seu Pedido Foi Enviado!
      </Heading>

      <Text
        className="email-text"
        style={{
          fontSize: "15px",
          lineHeight: "24px",
          color: "#3c3c43",
          margin: "0 0 24px",
        }}
      >
        O pedido{" "}
        <strong className="email-brand" style={{ color: "#2d4a2e" }}>
          #{orderId.slice(0, 8)}
        </strong>{" "}
        já está a caminho!
      </Text>

      <Hr
        className="email-divider"
        style={{
          borderColor: "#e8e2d9",
          margin: "24px 0",
        }}
      />

      {shippingCarrier && (
        <Text
          className="email-muted"
          style={{
            fontSize: "13px",
            lineHeight: "20px",
            color: "#6b6b6b",
            margin: "0 0 8px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Transportadora: <strong className="email-text" style={{ color: "#3c3c43" }}>{shippingCarrier}</strong>
        </Text>
      )}

      <Text
        className="email-muted"
        style={{
          fontSize: "13px",
          lineHeight: "20px",
          color: "#6b6b6b",
          margin: "0 0 12px",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Código de rastreio:
      </Text>

      <Section
        style={{
          backgroundColor: "#f5f3ef",
          border: "1px solid #e8e2d9",
          borderRadius: "6px",
          padding: "16px 20px",
          margin: "0 0 24px",
          textAlign: "center" as const,
        }}
      >
        <Text
          style={{
            fontFamily: "'Space Mono', 'Courier New', monospace",
            fontSize: "18px",
            fontWeight: 700,
            color: "#2d4a2e",
            margin: 0,
            letterSpacing: "0.08em",
          }}
        >
          {trackingCode}
        </Text>
      </Section>

      <Section style={{ textAlign: "center" as const, margin: "0 0 24px" }}>
        <Link
          href={orderUrl}
          style={{
            display: "inline-block",
            backgroundColor: "#2d4a2e",
            color: "#ffffff",
            fontSize: "13px",
            fontWeight: 600,
            textDecoration: "none",
            padding: "12px 28px",
            borderRadius: "6px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Acompanhar Pedido
        </Link>
      </Section>

      <Hr
        className="email-divider"
        style={{
          borderColor: "#e8e2d9",
          margin: "24px 0",
        }}
      />

      <Text
        className="email-text"
        style={{
          fontSize: "15px",
          lineHeight: "24px",
          color: "#3c3c43",
          margin: "0 0 8px",
        }}
      >
        Obrigado por comprar na{" "}
        <strong>SementesDeColecao.com</strong>!
      </Text>

      <Section style={{ marginTop: "32px" }}>
        <Text
          className="email-muted"
          style={{
            fontSize: "12px",
            lineHeight: "18px",
            color: "#6b6b6b",
            margin: 0,
          }}
        >
          Se você tiver alguma dúvida, entre em contato conosco
          respondendo a este e-mail.
        </Text>
      </Section>
    </EmailLayout>
  );
}
