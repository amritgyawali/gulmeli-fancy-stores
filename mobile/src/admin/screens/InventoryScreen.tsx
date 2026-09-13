import { useMemo, useState } from "react";
import { View } from "react-native";
import { AdminShell, Panel } from "@/admin/ui/Shell";
import {
  A,
  Btn,
  Col,
  EmptyState,
  Grid,
  IconBtn,
  Pill,
  Row,
  StatTile,
  Tabs,
} from "@/admin/ui/primitives";
import { TextBox } from "@/admin/ui/inputs";
import { useLayout } from "@/admin/ui/theme";
import { useAdmin } from "@/admin/AdminProvider";
import { useFormat } from "@/admin/ui/useFormat";
import { inventoryForecast } from "@/admin/core/assist";
import { go } from "@/admin/navigate";
import type { AdminProduct } from "@/admin/core/types";

type InventoryView = "all" | "low" | "out" | "forecast";

export function InventoryScreen() {
  const { theme, store, write, data, allowed, notify } = useAdmin();
  const format = useFormat();
  const layout = useLayout();
  const [view, setView] = useState<InventoryView>("low");
  const [search, setSearch] = useState("");
  const [adjust, setAdjust] = useState<Record<string, string>>({});
  const [bulkDelta, setBulkDelta] = useState("");

  const canEdit = allowed("inventory", "edit");

  const products = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return data.products
      .filter((product) => !product.unlimitedStock)
      .filter((product) =>
        needle
          ? String(product.name).toLowerCase().includes(needle) ||
            String(product.sku).toLowerCase().includes(needle)
          : true,
      )
      .filter((product) => {
        const stock = Number(product.stock) || 0;
        const threshold = Number(product.lowStockThreshold ?? 5);
        if (view === "out") return stock <= 0;
        if (view === "low") return stock > 0 && stock <= threshold;
        return true;
      })
      .sort((a, b) => Number(a.stock) - Number(b.stock));
  }, [data.products, search, view]);

  const forecast = useMemo(() => inventoryForecast(data), [data]);

  const totals = useMemo(() => {
    const all = data.products.filter((product) => !product.deletedAt);
    return {
      onHand: all.reduce(
        (sum, product) => sum + (Number(product.stock) || 0),
        0,
      ),
      reserved: all.reduce(
        (sum, product) => sum + (Number(product.reservedStock) || 0),
        0,
      ),
      incoming: all.reduce(
        (sum, product) => sum + (Number(product.incomingStock) || 0),
        0,
      ),
      costValue: all.reduce(
        (sum, product) =>
          sum + (Number(product.costPrice) || 0) * (Number(product.stock) || 0),
        0,
      ),
      out: all.filter(
        (product) => !product.unlimitedStock && Number(product.stock) <= 0,
      ).length,
      low: all.filter(
        (product) =>
          !product.unlimitedStock &&
          Number(product.stock) > 0 &&
          Number(product.stock) <= Number(product.lowStockThreshold ?? 5),
      ).length,
    };
  }, [data.products]);

  const applyAdjustment = (
    product: AdminProduct,
    delta: number,
    reason: string,
  ) => {
    if (!Number.isFinite(delta) || delta === 0) {
      notify("Enter how many units to add or remove.", "danger");
      return;
    }
    const resulting = Math.max(0, (Number(product.stock) || 0) + delta);
    store.update("products", product.id, { stock: resulting }, write);
    store.create(
      "inventory_movements",
      {
        productId: product.id,
        variantId: "",
        type: delta > 0 ? "manual_increase" : "manual_decrease",
        quantity: delta,
        resultingStock: resulting,
        supplierId: null,
        unitCost: Number(product.costPrice) || 0,
        warehouse: String(product.warehouse ?? "Main"),
        reason,
        note: "",
      },
      write,
    );
    setAdjust((current) => ({ ...current, [product.id]: "" }));
    notify(`${product.name} is now at ${resulting}.`, "success");
  };

  return (
    <AdminShell
      title="Inventory"
      subtitle="Stock on hand, low-stock alerts, adjustments and what to reorder"
      actions={
        <Row gap={6}>
          <Btn
            title="Stock movements"
            icon="repeat"
            small
            theme={theme}
            onPress={() => go("/admin/r/inventory_movements")}
          />
          <Btn
            title="Purchase orders"
            icon="clipboard-list"
            small
            theme={theme}
            onPress={() => go("/admin/r/purchase_orders")}
          />
        </Row>
      }
    >
      <Grid columns={layout.columns} gap={12}>
        <StatTile
          label="Units on hand"
          value={format.number(totals.onHand)}
          icon="boxes-stacked"
          theme={theme}
        />
        <StatTile
          label="Reserved"
          value={format.number(totals.reserved)}
          icon="lock"
          theme={theme}
        />
        <StatTile
          label="Incoming"
          value={format.number(totals.incoming)}
          icon="truck-ramp-box"
          theme={theme}
        />
        <StatTile
          label="Stock value at cost"
          value={format.compact(totals.costValue)}
          icon="sack-dollar"
          theme={theme}
        />
        <StatTile
          label="Out of stock"
          value={format.number(totals.out)}
          icon="circle-xmark"
          tone={totals.out ? theme.danger : undefined}
          theme={theme}
          onPress={() => setView("out")}
        />
        <StatTile
          label="Low stock"
          value={format.number(totals.low)}
          icon="triangle-exclamation"
          tone={totals.low ? theme.warning : undefined}
          theme={theme}
          onPress={() => setView("low")}
        />
      </Grid>

      <Tabs
        tabs={[
          { key: "low", label: "Low stock", badge: totals.low },
          { key: "out", label: "Out of stock", badge: totals.out },
          { key: "all", label: "All products" },
          {
            key: "forecast",
            label: "Reorder suggestions",
            badge: forecast.length,
          },
        ]}
        active={view}
        onChange={(next) => setView(next as InventoryView)}
        theme={theme}
      />

      {view === "forecast" ? (
        <Panel
          title="What to reorder"
          subtitle="Based on how fast each product has sold over the last 30 days"
        >
          {forecast.length ? (
            <Col gap={10}>
              {forecast.slice(0, 25).map((entry) => (
                <Row key={entry.product.id} justify="space-between" gap={10}>
                  <View style={{ flex: 1 }}>
                    <A size={12.5} weight="600" numberOfLines={1}>
                      {String(entry.product.name)}
                    </A>
                    <A size={11} color={theme.muted}>
                      {`${entry.product.stock} in stock · selling ${entry.dailyRate}/day · ${
                        Number.isFinite(entry.daysLeft)
                          ? `${entry.daysLeft} days left`
                          : "no recent sales"
                      }`}
                    </A>
                  </View>
                  <Col gap={4} style={{ alignItems: "flex-end" }}>
                    <Pill
                      label={`Order ${entry.suggestedOrder}`}
                      color={entry.daysLeft < 7 ? theme.danger : theme.warning}
                      theme={theme}
                      small
                    />
                    {canEdit && entry.suggestedOrder > 0 && (
                      <Btn
                        title="Restock"
                        icon="plus"
                        small
                        theme={theme}
                        onPress={() =>
                          applyAdjustment(
                            entry.product,
                            entry.suggestedOrder,
                            "Restock from the reorder suggestion",
                          )
                        }
                      />
                    )}
                  </Col>
                </Row>
              ))}
            </Col>
          ) : (
            <EmptyState
              icon="circle-check"
              title="Nothing needs reordering"
              theme={theme}
            />
          )}
        </Panel>
      ) : (
        <>
          <Row gap={8} wrap>
            <View style={{ flex: 1, minWidth: 200 }}>
              <TextBox
                value={search}
                onChange={setSearch}
                placeholder="Search by name or SKU"
                theme={theme}
                label="Search products"
              />
            </View>
            {canEdit && (
              <>
                <View style={{ width: 140 }}>
                  <TextBox
                    value={bulkDelta}
                    onChange={setBulkDelta}
                    placeholder="+10 or -5"
                    keyboard="numeric"
                    theme={theme}
                    label="Bulk change"
                  />
                </View>
                <Btn
                  title={`Apply to ${products.length} shown`}
                  icon="layer-group"
                  small
                  theme={theme}
                  onPress={() => {
                    const delta = Number(bulkDelta);
                    if (!Number.isFinite(delta) || delta === 0) {
                      notify(
                        "Enter a positive or negative number first.",
                        "danger",
                      );
                      return;
                    }
                    products.forEach((product) =>
                      applyAdjustment(product, delta, "Bulk stock update"),
                    );
                    setBulkDelta("");
                  }}
                />
              </>
            )}
          </Row>

          <Panel title={`${products.length} product(s)`}>
            {products.length ? (
              <Col gap={10}>
                {products.slice(0, 60).map((product) => {
                  const stock = Number(product.stock) || 0;
                  const threshold = Number(product.lowStockThreshold ?? 5);
                  return (
                    <Row key={product.id} justify="space-between" gap={10} wrap>
                      <View style={{ flex: 1, minWidth: 160 }}>
                        <A size={12.5} weight="600" numberOfLines={1}>
                          {String(product.name)}
                        </A>
                        <A size={11} color={theme.muted}>
                          {`${product.sku} · alert at ${threshold} · ${format.money(
                            (Number(product.costPrice) || 0) * stock,
                          )} at cost`}
                        </A>
                      </View>
                      <Row gap={6}>
                        <Pill
                          label={
                            stock <= 0
                              ? "Out of stock"
                              : stock <= threshold
                                ? `${stock} left`
                                : String(stock)
                          }
                          color={
                            stock <= 0
                              ? theme.danger
                              : stock <= threshold
                                ? theme.warning
                                : theme.success
                          }
                          theme={theme}
                          small
                        />
                        {canEdit && (
                          <>
                            <View style={{ width: 82 }}>
                              <TextBox
                                value={adjust[product.id] ?? ""}
                                onChange={(value) =>
                                  setAdjust((current) => ({
                                    ...current,
                                    [product.id]: value,
                                  }))
                                }
                                placeholder="±"
                                keyboard="numeric"
                                theme={theme}
                                label={`Adjust ${product.name}`}
                              />
                            </View>
                            <IconBtn
                              icon="check"
                              label={`Apply the change to ${product.name}`}
                              theme={theme}
                              onPress={() =>
                                applyAdjustment(
                                  product,
                                  Number(adjust[product.id]),
                                  "Manual stock adjustment",
                                )
                              }
                            />
                          </>
                        )}
                        <IconBtn
                          icon="pen"
                          label={`Open ${product.name}`}
                          theme={theme}
                          onPress={() => go(`/admin/r/products/${product.id}`)}
                        />
                      </Row>
                    </Row>
                  );
                })}
                {products.length > 60 && (
                  <A size={11} color={theme.muted}>
                    {`Showing the first 60 of ${products.length}. Narrow the search to see the rest.`}
                  </A>
                )}
              </Col>
            ) : (
              <EmptyState
                icon="boxes-stacked"
                title={
                  view === "out"
                    ? "Nothing is out of stock"
                    : "No products match"
                }
                theme={theme}
              />
            )}
          </Panel>
        </>
      )}
    </AdminShell>
  );
}
