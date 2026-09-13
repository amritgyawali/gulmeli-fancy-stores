import { useCallback, useMemo } from "react";
import { useAdmin } from "@/admin/AdminProvider";
import { getResource } from "@/admin/core/resources/index";
import { getPath } from "@/admin/core/query";
import {
  formatCompactMoney,
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
} from "@/admin/core/format";

/** Formatting bound to the store's own currency, date and number settings. */
export function useFormat() {
  const { published, store, revision } = useAdmin();
  const localisation = published.localisation;

  const resolve = useCallback(
    (resource: string, id: unknown) => {
      if (!resource || id === null || id === undefined || id === "") return "—";
      const definition = getResource(resource);
      const record = store.get(resource, String(id));
      if (!record) return String(id);
      return String(getPath(record, definition?.labelField ?? "id") ?? id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, revision],
  );

  return useMemo(
    () => ({
      money: (value: unknown, decimals = 0) =>
        formatMoney(value, localisation, decimals),
      compact: (value: unknown) => formatCompactMoney(value, localisation),
      number: (value: unknown) => formatNumber(value, localisation),
      date: (value: unknown) => formatDate(value, localisation),
      dateTime: (value: unknown) => formatDateTime(value, localisation),
      resolve,
    }),
    [localisation, resolve],
  );
}
