// src/lib/flash-sales.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncProductSaleFlags(supabase: any, flashSaleId: string, activate: boolean) {
  const { data: fs } = await supabase
    .from("flash_sales")
    .select("discount_type, discount_value, ends_at")
    .eq("id", flashSaleId)
    .single();

  if (!fs) return;

  const { data: items } = await supabase
    .from("flash_sale_items")
    .select("product_id, category_id")
    .eq("flash_sale_id", flashSaleId);

  if (!items || items.length === 0) return;

  const directProductIds = (items as { product_id: string | null; category_id: string | null }[])
    .filter((i) => i.product_id)
    .map((i) => i.product_id!);

  const categoryIds = (items as { product_id: string | null; category_id: string | null }[])
    .filter((i) => i.category_id)
    .map((i) => i.category_id!);

  let categoryProductIds: string[] = [];
  if (categoryIds.length > 0) {
    const { data: catProducts } = await supabase
      .from("products")
      .select("id")
      .in("category_id", categoryIds)
      .eq("active", true);

    categoryProductIds = (catProducts ?? []).map((p: { id: string }) => p.id);
  }

  const allProductIds = [...new Set([...directProductIds, ...categoryProductIds])];
  if (allProductIds.length === 0) return;

  if (activate) {
    await supabase
      .from("products")
      .update({
        on_sale: true,
        discount_type: fs.discount_type,
        discount_value: fs.discount_value,
        sale_ends_at: fs.ends_at,
      })
      .in("id", allProductIds);
  } else {
    await supabase
      .from("products")
      .update({
        on_sale: false,
        discount_type: null,
        discount_value: 0,
        sale_ends_at: null,
      })
      .in("id", allProductIds);
  }
}