import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface RunMutationOptions<T> {
  url: string;
  method?: "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Toast de sucesso. Passe `null` para não exibir. */
  successMessage?: string | null;
  /** Prefixo/fallback da mensagem de erro quando o servidor não manda uma. */
  errorMessage?: string;
  /** Aplicada antes do fetch (UI otimista). */
  optimistic?: () => void;
  /** Desfaz a `optimistic` quando o fetch falha. */
  rollback?: () => void;
  onSuccess?: (data: T) => void;
}

export interface MutationResult<T> {
  ok: boolean;
  data: T | null;
}

/**
 * Caminho único para mutações do admin: UI otimista opcional, toast de
 * sucesso/erro e haptic. Substitui os antigos catches silenciosos — falha
 * nunca mais acontece sem feedback ao usuário.
 */
export async function runMutation<T = unknown>({
  url,
  method = "POST",
  body,
  successMessage,
  errorMessage = "Algo deu errado. Tente novamente.",
  optimistic,
  rollback,
  onSuccess,
}: RunMutationOptions<T>): Promise<MutationResult<T>> {
  optimistic?.();
  try {
    const res = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      rollback?.();
      toast.error(err.error ?? errorMessage);
      haptic("error");
      return { ok: false, data: null };
    }
    const data = (await res.json().catch(() => null)) as T;
    if (successMessage !== null && successMessage !== undefined) {
      toast.success(successMessage);
    }
    haptic("success");
    onSuccess?.(data as T);
    return { ok: true, data };
  } catch {
    rollback?.();
    toast.error(errorMessage);
    haptic("error");
    return { ok: false, data: null };
  }
}
