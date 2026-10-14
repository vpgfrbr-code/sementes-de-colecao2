import {
  Heading,
  Text,
  Section,
  Hr,
} from "@react-email/components";
import { EmailLayout, type EmailBranding } from "./email-layout";

interface OrderConfirmedEmailProps {
  orderId: string;
  branding?: EmailBranding;
}

export function OrderConfirmedEmail({ orderId, branding }: OrderConfirmedEmailProps) {
  return (
    <EmailLayout
      preview="Seu pedido foi confirmado - SementesDeColecao.com"
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
        Pagamento Confirmado!
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
        Seu pedido{" "}
        <strong className="email-brand" style={{ color: "#2d4a2e" }}>
          #{orderId.slice(0, 8)}
        </strong>{" "}
        foi confirmado com sucesso. Estamos preparando tudo para envio.
      </Text>

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
          Se você não fez esta compra, entre em contato conosco
          respondendo a este e-mail.
        </Text>
      </Section>
    </EmailLayout>
  );
}
