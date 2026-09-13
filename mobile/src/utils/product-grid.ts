import type { Product } from "@/types/shop";

export type ProductGridRow =
  | { id: "tabs"; kind: "tabs" }
  | { id: string; kind: "products"; products: Product[] };
export function productGridRows(products: Product[]): ProductGridRow[] {
  const rows: ProductGridRow[] = [{ id: "tabs", kind: "tabs" }];
  for (let index = 0; index < products.length; index += 2) {
    const pair = products.slice(index, index + 2);
    rows.push({
      id: pair.map((p) => p.id).join(":"),
      kind: "products",
      products: pair,
    });
  }
  return rows;
}
