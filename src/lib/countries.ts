type IntlWithSupportedValues = typeof Intl & {
  supportedValuesOf?: (key: string) => string[];
};

const countryNames = new Intl.DisplayNames(["es"], { type: "region" });

function getFallbackRegionCodes() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const fallback: string[] = [];
  for (const first of letters) {
    for (const second of letters) {
      const code = `${first}${second}`;
      const label = countryNames.of(code);
      if (label && label !== code) fallback.push(code);
    }
  }
  return fallback;
}

const regionCodeList = (() => {
  try {
    const fromIntl = ((Intl as IntlWithSupportedValues).supportedValuesOf?.("region") ?? []) as string[];
    if (fromIntl.length > 0) return fromIntl;
  } catch {
    // noop: fallback below
  }
  return getFallbackRegionCodes();
})();

export type CountryOption = {
  code: string;
  name: string;
};

export const COUNTRY_OPTIONS: CountryOption[] = regionCodeList
  .map((code) => ({
    code,
    name: countryNames.of(code) || code,
  }))
  .filter((entry) => entry.name !== entry.code)
  .sort((a, b) => a.name.localeCompare(b.name, "es"));
