import { redirectLegacyQueue, type LegacyQueueRedirectProps } from "@/app/legacy-queue-redirect";

export default async function LegacyToPackJPage(props: LegacyQueueRedirectProps) {
  await redirectLegacyQueue("/database/topack", props);
}
