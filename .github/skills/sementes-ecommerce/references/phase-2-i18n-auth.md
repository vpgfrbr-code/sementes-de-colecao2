# Phase 2: Internationalization (i18n) and Authentication (Clerk)

## Steps

### 1. Configure next-intl

Create `i18n/routing.ts`:

```typescript
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["pt", "en", "es"],
  defaultLocale: "pt",
});
```

Create `i18n/request.ts`:

```typescript
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

### 2. Create Message Files

`messages/pt.json`:
```json
{
  "common": {
    "brand": "SementesDeColecao.com",
    "home": "Início",
    "cart": "Carrinho",
    "checkout": "Finalizar Compra",
    "addToCart": "Adicionar ao Carrinho",
    "continueShopping": "Continuar Comprando",
    "emptyCart": "Seu carrinho está vazio",
    "total": "Total",
    "quantity": "Quantidade",
    "remove": "Remover",
    "search": "Buscar",
    "loading": "Carregando..."
  },
  "product": {
    "inStock": "Em estoque",
    "outOfStock": "Esgotado",
    "price": "Preço",
    "description": "Descrição"
  },
  "checkout": {
    "title": "Finalizar Pedido",
    "guestCheckout": "Comprar como Convidado",
    "orLogin": "ou faça login para uma experiência completa",
    "email": "E-mail",
    "name": "Nome Completo",
    "address": "Endereço",
    "city": "Cidade",
    "state": "Estado",
    "zip": "CEP",
    "payWithPix": "Pagar com PIX",
    "scanQrCode": "Escaneie o QR Code para pagar",
    "pixCopied": "Código PIX copiado!",
    "copyPixCode": "Copiar código PIX"
  },
  "order": {
    "waitingPayment": "Aguardando Pagamento",
    "approved": "Pagamento Aprovado",
    "confirmed": "Pedido Confirmado",
    "emailSent": "Confirmação enviada para seu e-mail"
  },
  "metadata": {
    "homeTitle": "Sementes Raras de Coleção",
    "homeDescription": "Loja especializada em sementes raras de coleção. Pagamento rápido via PIX."
  }
}
```

Create `messages/en.json` and `messages/es.json` with equivalent translations.

### 3. Configure Middleware

Create `middleware.ts` merging Clerk + next-intl:

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const isProtectedRoute = createRouteMatcher([
  "/:locale/conta(.*)",
  "/:locale/meus-pedidos(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
  return intlMiddleware(req);
});

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
```

### 4. Update App Layout for Locale

Move layout to `app/[locale]/layout.tsx`:

```typescript
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ClerkProvider } from "@clerk/nextjs";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <ClerkProvider>
      <html lang={locale}>
        <body>
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

## Completion Criteria

- [ ] URL routing works for `/pt`, `/en`, `/es`
- [ ] Default locale (`pt`) loads without prefix
- [ ] Clerk sign-in/sign-up pages work with locale routing
- [ ] Translations load correctly for all 3 locales
- [ ] Protected routes redirect to sign-in
