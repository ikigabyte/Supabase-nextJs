import { redirect } from "next/navigation";

type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

type LegacyQueueRedirectProps = {
  searchParams?: PageSearchParams;
};

function buildSearchString(params: Record<string, string | string[] | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "undefined") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        search.append(key, item);
      }
      continue;
    }

    search.append(key, value);
  }

  const serialized = search.toString();
  return serialized ? `?${serialized}` : "";
}

export async function redirectLegacyQueue(
  destinationPath: string,
  { searchParams }: LegacyQueueRedirectProps
) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  redirect(`${destinationPath}${buildSearchString(resolvedSearchParams)}`);
}

export type { LegacyQueueRedirectProps };
