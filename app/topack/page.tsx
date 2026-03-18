import { redirectLegacyQueue, type LegacyQueueRedirectProps } from "@/app/legacy-queue-redirect";

export default async function LegacyToPackPage(props: LegacyQueueRedirectProps) {
  await redirectLegacyQueue("/database/topack", props);
}
