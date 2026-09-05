/** Capitalisation FR légère pour libellés open data (ex. stations Vélô). */
export function frenchTitleCase(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  const smallWords = new Set([
    'de',
    'des',
    'du',
    'la',
    'le',
    'les',
    'l',
    'd',
    'et',
    'en',
    'à',
    'au',
    'aux',
  ]);
  return trimmed
    .toLocaleLowerCase('fr-FR')
    .split(/(\s+|-|\/)/)
    .map((part, index) => {
      if (!part || /^(\s+|-|\/)$/.test(part)) {
        return part;
      }
      if (index > 0 && smallWords.has(part)) {
        return part;
      }
      if (part.includes("'")) {
        return part
          .split("'")
          .map((chunk) =>
            chunk
              ? chunk.charAt(0).toLocaleUpperCase('fr-FR') + chunk.slice(1)
              : chunk,
          )
          .join("'");
      }
      return part.charAt(0).toLocaleUpperCase('fr-FR') + part.slice(1);
    })
    .join('');
}
