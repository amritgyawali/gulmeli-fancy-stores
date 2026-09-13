/** Keep saved seller names, order references and older links usable after renaming. */
export function currentBrand(text: string): string {
  return text
    .replace(/\bGFC10\b/gi, "GULMELI10")
    .replace(/\bGFC\b/g, "Gulmeli Fancy Stores");
}
