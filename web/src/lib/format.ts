export const rs = (value: number) =>
  `Rs.${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export const shortDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

export const errorMessage = (error: unknown) =>
  error && typeof error === "object" && "message" in error
    ? String((error as { message: unknown }).message)
    : "Could not connect to the store. Please try again.";
