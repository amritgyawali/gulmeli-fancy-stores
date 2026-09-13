import { writeFileSync } from "node:fs";
import { products } from "../src/data/catalog.ts";

const sql = (value: unknown) =>
  value == null ? "null" : `'${String(value).replaceAll("'", "''")}'`;
const rows = products.map((p, index) => {
  const { id, name, price, stock, category, group, imageUrl, ...details } = p;
  return `(${[id, name, price, stock, category, group, imageUrl, JSON.stringify(details), index].map(sql).join(", ")})`;
});
writeFileSync(
  new URL("../supabase/seed.sql", import.meta.url),
  `-- SAMPLE inventory from the original app. Review prices/stock before accepting real orders.\n-- Safe to rerun: existing product records are not overwritten.\ninsert into public.products(id,name,price,stock,category,product_group,image_url,details,sort_order) values\n${rows.join(",\n")}\non conflict (id) do nothing;\n`,
);
console.log(`Prepared ${rows.length} sample products in supabase/seed.sql.`);
