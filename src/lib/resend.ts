import { Resend } from "resend";
import { OrderConfirmedEmail } from "@/emails/order-confirmed";
import { OrderLookupCodeEmail } from "@/emails/order-lookup-code";
import { OrderShippedEmail } from "@/emails/order-shipped";
import { ReviewInviteEmail } from "@/emails/review-invite";
import {
  AdminNewOrderEmail,
  type AdminNewOrderEmailProps,
} from "@/emails/admin-new-order";
import {
  AdminPaymentPendingEmail,
  type AdminPaymentPendingEmailProps,
} from "@/emails/admin-payment-pending";
import { getBrandingSettings, toAbsoluteUrl } from "@/lib/branding";
import type { EmailBranding } from "@/emails/email-layout";
import { log } from "@/lib/log";

let _resend: Resend | null = null;

function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

/**
 * Reads the branding config and converts it to the props the email layout
 * expects (absolute logo URL + site URL). Called once per outgoing email so
 * superadmin changes show up on the next send.
 */
async function getEmailBranding(): Promise<EmailBranding> {
  const b = await getBrandingSettings();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
    "https://sementesdecolecao.com";
  return {
    mode: b.mode,
    brandName: b.brandName,
    logoUrl: toAbsoluteUrl(b.logoUrl),
    siteUrl,
  };
}

export async function sendOrderConfirmationEmail({
  to,
  orderId,
}: {
  to: string;
  orderId: string;
}) {
  const branding = await getEmailBranding();
  await getResend().emails.send({
    from: "SementesDeColecao.com <pedidos@sementesdecolecao.com>",
    to,
    subject: "Pedido Confirmado - SementesDeColecao.com",
    react: OrderConfirmedEmail({ orderId, branding }),
  });
}

export async function sendLookupCodeEmail({
  to,
  code,
}: {
  to: string;
  code: string;
}) {
  const branding = await getEmailBranding();
  await getResend().emails.send({
    from: "SementesDeColecao.com <pedidos@sementesdecolecao.com>",
    to,
    subject: `Código de Verificação: ${code} - SementesDeColecao.com`,
    react: OrderLookupCodeEmail({ code, branding }),
  });
}

export async function sendOrderShippedEmail({
  to,
  orderId,
  trackingCode,
  shippingCarrier,
  orderUrl,
}: {
  to: string;
  orderId: string;
  trackingCode: string;
  shippingCarrier?: string | null;
  orderUrl: string;
}) {
  const branding = await getEmailBranding();
  await getResend().emails.send({
    from: "SementesDeColecao.com <pedidos@sementesdecolecao.com>",
    to,
    subject: "Seu Pedido Foi Enviado! - SementesDeColecao.com",
    react: OrderShippedEmail({
      orderId,
      trackingCode,
      shippingCarrier,
      orderUrl,
      branding,
    }),
  });
}

export async function sendReviewInviteEmail({
  to,
  customerName,
  orderId,
  reviewUrl,
}: {
  to: string;
  customerName: string;
  orderId: string;
  reviewUrl: string;
}) {
  const branding = await getEmailBranding();
  await getResend().emails.send({
    from: "SementesDeColecao.com <pedidos@sementesdecolecao.com>",
    to,
    subject: "Como foi sua experiência? - SementesDeColecao.com",
    react: ReviewInviteEmail({ customerName, orderId, reviewUrl, branding }),
  });
}

export async function sendAdminNewOrderEmail(props: AdminNewOrderEmailProps) {
  const to = process.env.SUPERADMIN_NOTIFY_EMAIL;
  if (!to) {
    log.warn(
      "[resend] SUPERADMIN_NOTIFY_EMAIL not set; skipping admin new-order notification"
    );
    return;
  }

  const amount = (props.totalCents / 100).toFixed(2).replace(".", ",");
  const currencyPrefix = props.currency === "USD" ? "US$" : "R$";
  const branding = await getEmailBranding();

  await getResend().emails.send({
    from: "SementesDeColecao.com <pedidos@sementesdecolecao.com>",
    to,
    subject: `Novo pedido #${props.orderShortId} - ${currencyPrefix} ${amount}`,
    react: AdminNewOrderEmail({ ...props, branding }),
  });
}

export async function sendPaymentApproverEmail(
  props: AdminPaymentPendingEmailProps
) {
  const raw = process.env.PAYMENT_APPROVER_NOTIFY_EMAIL;
  if (!raw) {
    log.warn(
      "[resend] PAYMENT_APPROVER_NOTIFY_EMAIL not set; skipping payment approver notification"
    );
    return;
  }
  const to = raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  const amount = (props.totalCents / 100).toFixed(2).replace(".", ",");
  const currencyPrefix = props.currency === "USD" ? "US$" : "R$";
  const branding = await getEmailBranding();

  await getResend().emails.send({
    from: "SementesDeColecao.com <pedidos@sementesdecolecao.com>",
    to,
    subject: `Confirmar pagamento #${props.orderShortId} - ${currencyPrefix} ${amount}`,
    react: AdminPaymentPendingEmail({ ...props, branding }),
  });
}
