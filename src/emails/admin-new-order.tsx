import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from "@react-email/components";
import { EmailLayout, type EmailBranding } from "./email-layout";

export interface AdminNewOrderItem {
  name: string;
  quantity: number;
  unitPriceCents: number;
}

export interface AdminNewOrderEmailProps {
  orderId: string;
  orderShortId: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  totalCents: number;
  subtotalCents: number;
  currency: string;
  paymentMethod: string;
  couponCode: string | null;
  manualResellerEmail: string | null;
  manualCommissionPercent: number | null;
  shippingAddress: string;
  items: AdminNewOrderItem[];
  adminUrl: string;
  branding?: EmailBranding;
}

function formatMoney(cents: number, currency: string) {
  const amount = (cents / 100).toFixed(2).replace(".", ",");
  const prefix = currency === "USD" ? "US$" : "R$";
  return `${prefix} ${amount}`;
}

export function AdminNewOrderEmail({
  orderId,
  orderShortId,
  createdAt,
  customerName,
  customerEmail,
  totalCents,
  subtotalCents,
  currency,
  paymentMethod,
  couponCode,
  manualResellerEmail,
  manualCommissionPercent,
  shippingAddress,
  items,
  adminUrl,
  branding,
}: AdminNewOrderEmailProps) {
  const rowStyle = {
    fontSize: "13px",
    lineHeight: "20px",
    color: "#3c3c43",
    margin: "0 0 4px",
  } as const;

  const labelStyle = {
    fontFamily: "'Space Mono', 'Courier New', monospace",
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.2em",
    color: "#6b6b6b",
    margin: "0 0 4px",
  } as const;

  return (
    <EmailLayout
      preview={`Novo pedido #${orderShortId} - ${formatMoney(totalCents, currency)}`}
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
        Novo pedido aprovado
      </Heading>

      <Text
        className="email-muted"
        style={{
          fontFamily: "'Space Mono', 'Courier New', monospace",
          fontSize: "11px",
          letterSpacing: "0.15em",
          color: "#6b6b6b",
          margin: "0 0 24px",
        }}
      >
        #{orderShortId} &middot; {createdAt}
      </Text>

      <Section
        style={{
          backgroundColor: "#f6f3ee",
          borderRadius: "8px",
          padding: "16px 20px",
          margin: "0 0 24px",
        }}
      >
        <Text style={labelStyle}>Total</Text>
        <Text
          className="email-brand"
          style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "#2d4a2e",
            margin: "0 0 12px",
          }}
        >
          {formatMoney(totalCents, currency)}
        </Text>
        <Text style={rowStyle}>
          Subtotal: {formatMoney(subtotalCents, currency)}
        </Text>
        <Text style={rowStyle}>Pagamento: {paymentMethod}</Text>
      </Section>

      <Text style={labelStyle}>Cliente</Text>
      <Text style={rowStyle}>{customerName}</Text>
      <Text style={{ ...rowStyle, margin: "0 0 16px" }}>{customerEmail}</Text>

      <Text style={labelStyle}>Endereco de entrega</Text>
      <Text style={{ ...rowStyle, whiteSpace: "pre-line" as const, margin: "0 0 16px" }}>
        {shippingAddress}
      </Text>

      {couponCode ? (
        <>
          <Text style={labelStyle}>Cupom</Text>
          <Text style={{ ...rowStyle, margin: "0 0 16px" }}>{couponCode}</Text>
        </>
      ) : null}

      {manualResellerEmail ? (
        <>
          <Text style={labelStyle}>Revendedor atribuido</Text>
          <Text style={{ ...rowStyle, margin: "0 0 16px" }}>
            {manualResellerEmail}
            {manualCommissionPercent != null
              ? ` (${manualCommissionPercent}%)`
              : ""}
          </Text>
        </>
      ) : null}

      <Hr
        className="email-divider"
        style={{ borderColor: "#e8e2d9", margin: "20px 0" }}
      />

      <Text style={labelStyle}>Itens</Text>
      {items.map((item, idx) => (
        <Text key={idx} style={rowStyle}>
          {item.quantity}x {item.name} &mdash;{" "}
          {formatMoney(item.unitPriceCents * item.quantity, currency)}
        </Text>
      ))}

      <Section style={{ marginTop: "28px", textAlign: "center" as const }}>
        <Button
          href={adminUrl}
          style={{
            backgroundColor: "#2d4a2e",
            color: "#ffffff",
            padding: "12px 24px",
            borderRadius: "6px",
            fontSize: "13px",
            fontWeight: 700,
            textTransform: "uppercase" as const,
            letterSpacing: "0.15em",
            textDecoration: "none",
          }}
        >
          Abrir no admin
        </Button>
      </Section>

      <Text
        className="email-muted"
        style={{
          fontFamily: "'Space Mono', 'Courier New', monospace",
          fontSize: "10px",
          color: "#8a8275",
          margin: "20px 0 0",
          textAlign: "center" as const,
          wordBreak: "break-all" as const,
        }}
      >
        ID: {orderId}
      </Text>
    </EmailLayout>
  );
}
