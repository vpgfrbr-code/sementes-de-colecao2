export interface CreateChargeParams {
  correlationId: string;
  valueCents: number;
  customerName: string;
  customerEmail: string;
}

export interface WooviChargeResponse {
  charge: {
    globalID: string;
    correlationID: string;
    value: number;
    status: string;
    qrCodeImage: string;
    brCode: string;
  };
}

const PIX_ENABLED = !!process.env.WOOVI_API_KEY;

function createMockCharge(params: CreateChargeParams): WooviChargeResponse {
  const reais = (params.valueCents / 100).toFixed(2);
  return {
    charge: {
      globalID: `mock_${params.correlationId}`,
      correlationID: params.correlationId,
      value: params.valueCents,
      status: "ACTIVE",
      qrCodeImage: `https://placehold.co/256x256/2d4a2e/faf8f5?text=PIX+Mock%0AR$${reais}`,
      brCode: `00020126580014br.gov.bcb.pix0136mock-${params.correlationId}5204000053039865404${reais}5802BR`,
    },
  };
}

export async function createPixCharge(
  params: CreateChargeParams
): Promise<WooviChargeResponse> {
  if (!PIX_ENABLED) {
    console.warn("[woovi] WOOVI_API_KEY not set — returning mock charge");
    return createMockCharge(params);
  }

  const response = await fetch("https://api.woovi.com/api/v1/charge", {
    method: "POST",
    headers: {
      Authorization: process.env.WOOVI_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      correlationID: params.correlationId,
      value: params.valueCents,
      comment: "Pedido - SementesDeColecao.com",
      customer: {
        name: params.customerName,
        email: params.customerEmail,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Woovi API error ${response.status}: ${errorText}`);
  }

  return response.json();
}
