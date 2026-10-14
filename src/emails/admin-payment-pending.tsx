import {
  Button,
  Heading,
  Section,
  Text,
} from "@react-email/components";
import { EmailLayout, type EmailBranding } from "./email-layout";

export interface AdminPaymentPendingEmailProps {
  orderId: string;
  orderShortId: string;
  totalCents: number;
  currency: string;
  adminUrl: string;
  branding?: EmailBranding;
}

function formatMoney(cents: number, currency: string) {
  const amount = (cents / 100).toFixed(2).replace(".", ",");
  const prefix = currency === "USD" ? "US$" : "R$";
  return `${prefix} ${amount}`;
}

export function AdminPaymentPendingEmail({
  orderId,
  orderShortId,
  totalCents,
  currency,
  adminUrl,
  branding,
}: AdminPaymentPendingEmailProps) {
  return (
    <EmailLayout
      preview={`Confirmar pagamento #${orderShortId} - ${formatMoney(totalCents, currency)}`}
      branding={branding}
    >
      <Heading
        className="email-heading"
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: "#2d4a2e",
          margin: "0 0 8px",
        }}
      >
        Novo pedido aguardando pagamento
      </Heading>

      <Text
        className="email-muted"
        style={{
          fontFamily: "'Space Mono', 'Courier New', monospace",
          fontSize: "11px",
          letterSpacing: "0.15em",
          color: "#6b6b6b",
          margin: "0 0 28px",
        }}
      >
        #{orderShortId}
      </Text>

      <Section
        style={{
          backgroundColor: "#f6f3ee",
          borderRadius: "8px",
          padding: "20px 24px",
          margin: "0 0 28px",
          textAlign: "center" as const,
        }}
      >
        <Text
          style={{
            fontFamily: "'Space Mono', 'Courier New', monospace",
            fontSize: "10px",
            fontWeight: 700,
            textTransform: "uppercase" as const,
            letterSpacing: "0.2em",
            color: "#6b6b6b",
            margin: "0 0 8px",
          }}
        >
          Valor total
        </Text>
        <Text
          className="email-brand"
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "#2d4a2e",
            margin: "0",
          }}
        >
          {formatMoney(totalCents, currency)}
        </Text>
      </Section>

      <Section style={{ textAlign: "center" as const }}>
        <Button
          href={adminUrl}
          style={{
            backgroundColor: "#2d4a2e",
            color: "#ffffff",
            padding: "14px 32px",
            borderRadius: "6px",
            fontSize: "13px",
            fontWeight: 700,
            textTransform: "uppercase" as const,
            letterSpacing: "0.15em",
            textDecoration: "none",
          }}
        >
          Confirmar Pagamento
        </Button>
      </Section>

      <Text
        className="email-muted"
        style={{
          fontFamily: "'Space Mono', 'Courier New', monospace",
          fontSize: "10px",
          color: "#8a8275",
          margin: "24px 0 0",
          textAlign: "center" as const,
          wordBreak: "break-all" as const,
        }}
      >
        ID: {orderId}
      </Text>
    </EmailLayout>
  );
}
