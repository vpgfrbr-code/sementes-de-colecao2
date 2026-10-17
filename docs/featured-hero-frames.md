# Featured Product Hero — Scrub Frames Workflow

Guia rápido para preparar os assets do hero de scroll scrub usado em produtos
`is_featured`. Componente: [src/components/product/video-scrub-hero.tsx](../src/components/product/video-scrub-hero.tsx).

## Arquitetura em 2 tiers

O hero carrega os frames em dois tiers para ficar interativo o mais rápido possível:

1. **LQ (low-quality, ~320px WebP q55)** — baixado em paralelo, vira o scrub
   assim que os 97 frames chegam (~1 MB total). É o "instant play".
2. **HQ (full resolution, WebP)** — baixado em batches, substitui a LQ frame
   a frame conforme chega. Zero flash: o `drawFrame` faz fallback automático.

Layout de pastas esperado:

```
public/images/<slug>/
  frames/        ← high-res (WebP ou JPG)
    frame_0001.webp
    frame_0002.webp
    ...
  frames-lq/     ← low-res (WebP, gerado pelo script abaixo)
    frame_0001.webp
    ...
```

O path LQ é derivado automaticamente em
[src/app/\[locale\]/produto/\[slug\]/page.tsx](../src/app/[locale]/produto/[slug]/page.tsx)
trocando `/frames/` por `/frames-lq/`. Não precisa salvar campo no banco.

## Passo a passo para um novo produto featured

1. **Extrair frames HQ** do vídeo fonte para `public/images/<slug>/frames/`
   como `frame_0001.webp` até `frame_NNNN.webp`. (Ferramenta livre — ffmpeg,
   After Effects, etc.)

2. **Gerar o tier LQ** a partir dos HQ:

   ```powershell
   pnpm tsx scripts/generate-frames-lq.ts public/images/<slug>/frames
   ```

   Flags opcionais:
   - `--width 320` (padrão) — largura em pixels do tier LQ.
   - `--quality 55` (padrão) — qualidade WebP 0-100.

   O script escreve em `public/images/<slug>/frames-lq/` e imprime o tamanho
   total do payload LQ no final. Alvo recomendado: ≤ 1.5 MB.

3. **Configurar o produto no admin / banco**:
   - `is_featured = true`
   - `hero_video_url = "/images/<slug>/frames/frame_"` (prefixo até o número)
   - `hero_frame_count = <N>` (quantidade real de frames HQ extraídos)
   - `hero_poster_url = "/images/<slug>/<poster>.webp"` (opcional mas recomendado)

4. **Validar localmente**: acesse `/produto/<slug>` no desktop e role.
   - Poster some assim que o tier LQ termina.
   - Progresso (barra fina inferior) reflete só o HQ.
   - Scrub deve estar fluído no primeiro scroll mesmo antes do HQ completar.

## Quando regerar os LQ

- Depois de re-extrair / trocar os frames HQ.
- Se os LQ forem versionados e alguém apagar a pasta `frames-lq/`.

O script é idempotente — sempre sobrescreve o destino.

## Mobile

Mobile NÃO usa o scrub — serve poster estático via
[src/components/product/mobile-featured-hero.tsx](../src/components/product/mobile-featured-hero.tsx).
Não precisa se preocupar com peso dos frames em 3G/4G mobile.

## Troubleshooting

- **Aviso no console "lowResFrames length does not match"**: número de arquivos
  em `frames-lq/` diferente de `hero_frame_count`. Regere o LQ.
- **LQ não carrega**: confirme que o path `/images/<slug>/frames/` contém exatamente
  a substring `/frames/` (o derivador troca por `/frames-lq/`).
- **Scrub pulando**: provavelmente algum frame HQ falhou (404). Cheque a aba
  Network filtrando por `frame_`.
