import { redirectLegacyQueue, type LegacyQueueRedirectProps } from "@/app/legacy-queue-redirect";

export default async function LegacyToShipPage(props: LegacyQueueRedirectProps) {
  await redirectLegacyQueue("/database/toship", props);
}
