import { redirectLegacyQueue, type LegacyQueueRedirectProps } from "@/app/legacy-queue-redirect";

export default async function LegacyToCutPage(props: LegacyQueueRedirectProps) {
  await redirectLegacyQueue("/database/tocut", props);
}
