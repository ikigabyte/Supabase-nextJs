import { redirectLegacyQueue, type LegacyQueueRedirectProps } from "@/app/legacy-queue-redirect";

export default async function LegacyToPrintPage(props: LegacyQueueRedirectProps) {
  await redirectLegacyQueue("/database/toprint", props);
}
