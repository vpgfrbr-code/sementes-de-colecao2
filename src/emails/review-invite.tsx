import { Heading, Text, Section, Hr, Link } from "@react-email/components";
import { EmailLayout, type EmailBranding } from "./email-layout";

interface ReviewInviteEmailProps {
  customerName: string;
  orderId: string;
  reviewUrl: string;
  branding?: EmailBranding;
}

export function ReviewInviteEmail({
  customerName,
  orderId,
  reviewUrl,
  branding,
}: ReviewInviteEmailProps) {
  return (
    <EmailLayout
      preview="Como foi sua experiência? - SementesDeColecao.com"
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
        Como foi sua experiência, {customerName || "amigo"}?
      </Heading>

      <Text
        className="email-text"
        style={{
          fontSize: "15px",
          lineHeight: "24px",
          color: "#3c3c43",
          margin: "0 0 16px",
        }}
      >
        Esperamos que suas sementes do pedido{" "}
        <strong className="email-brand" style={{ color: "#2d4a2e" }}>#{orderId.slice(0, 8)}</strong>{" "}
        tenham chegado em perfeitas condições.
      </Text>

      <Text
        className="email-text"
        style={{
          fontSize: "15px",
          lineHeight: "24px",
          color: "#3c3c43",
          margin: "0 0 24px",
        }}
      >
        Sua avaliação ajuda outros colecionadores a escolherem com
        confiança — e leva pouco mais de um minuto.
      </Text>

      <Hr className="email-divider" style={{ borderColor: "#e8e2d9", margin: "24px 0" }} />

      <Section style={{ textAlign: "center" as const, margin: "0 0 24px" }}>
        <Link
          href={reviewUrl}
          style={{
            display: "inline-block",
            backgroundColor: "#2d4a2e",
            color: "#ffffff",
            padding: "14px 32px",
            fontSize: "14px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
            textDecoration: "none",
            borderRadius: "2px",
          }}
        >
          Avaliar meu Pedido
        </Link>
      </Section>

      <Text
        className="email-muted"
        style={{
          fontSize: "12px",
          lineHeight: "18px",
          color: "#6b6b6b",
          margin: "0 0 8px",
          textAlign: "center" as const,
        }}
      >
        Este link é único e válido por 30 dias.
      </Text>
    </EmailLayout>
  );
}
