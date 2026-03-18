import { redirectLegacyQueue, type LegacyQueueRedirectProps } from "@/app/legacy-queue-redirect";

export default async function LegacyToPrepackPage(props: LegacyQueueRedirectProps) {
  await redirectLegacyQueue("/database/toprepack", props);
}
