import * as React from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export function HoverInformation({ historySteps, scrollName }: { historySteps?: string[]; scrollName?: string }) {
  const stepsExist = historySteps && historySteps.length > 0;
  const steps = stepsExist ? historySteps : ["No history available"];

  const maxStepsToShow = 10;
  const stepsToDisplay =
    steps.length > maxStepsToShow
      ? [...steps.slice(0, maxStepsToShow - 1), `${steps.length - (maxStepsToShow - 1)} more history steps`]
      : steps;

  // Determine height based on number of steps
  let height = 120; // default
  if (stepsToDisplay.length >= 7) {
    height = 600;
  } else if (stepsToDisplay.length >= 5) {
    height = 400;
  } else if (stepsToDisplay.length >= 3) {
    height = 250;
  }

  return (
    <ScrollArea className="w-60 rounded-md border bg-white z-1" style={{ height }}>
      <div className="p-4 pb-[10px]">
        <h4 className="mb-4 font-medium leading-none">{scrollName}</h4>
        {stepsToDisplay.map((step, index) => (
          <React.Fragment key={index}>
            <div className="text-[10px] leading-4">{step}</div>
            {index < stepsToDisplay.length - 1 && <Separator className="my-2" />}
          </React.Fragment>
        ))}
      </div>
    </ScrollArea>
  );
}
