import {
  Heading,
  Text,
  Section,
  Hr,
} from "@react-email/components";
import { EmailLayout, type EmailBranding } from "./email-layout";

interface OrderLookupCodeEmailProps {
  code: string;
  branding?: EmailBranding;
}

export function OrderLookupCodeEmail({ code, branding }: OrderLookupCodeEmailProps) {
  return (
    <EmailLayout
      preview={`Seu código de verificação: ${code}`}
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
        Consulta de Pedidos
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
        Use o código abaixo para acessar seus pedidos. Ele expira em 15
        minutos.
      </Text>

      <Section
        style={{
          backgroundColor: "#f0ebe4",
          borderRadius: "8px",
          padding: "24px",
          textAlign: "center" as const,
          margin: "0 0 24px",
        }}
      >
        <Text
          style={{
            fontSize: "36px",
            fontWeight: 700,
            fontFamily: "'Space Mono', monospace",
            color: "#2d4a2e",
            letterSpacing: "8px",
            margin: 0,
          }}
        >
          {code}
        </Text>
      </Section>

      <Hr
        className="email-divider"
        style={{
          borderColor: "#e5ddd3",
          margin: "24px 0",
        }}
      />

      <Text
        className="email-muted"
        style={{
          fontSize: "13px",
          color: "#6b6b6b",
          lineHeight: "20px",
          margin: 0,
        }}
      >
        Se você não solicitou este código, ignore este email.
      </Text>
    </EmailLayout>
  );
}
