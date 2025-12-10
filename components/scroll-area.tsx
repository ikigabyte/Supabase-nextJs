import * as React from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export function ScrollAreaDemo({ historySteps, scrollName }: { historySteps?: string[]; scrollName?: string }) {
  const stepsExist = historySteps && historySteps.length > 0;
  const steps = stepsExist ? historySteps : ["No history available"];
  let heightClass = "h-72";
  if (steps.length < 2) {
    heightClass = "h-20";
  } else if (steps.length < 4) {
    heightClass = "h-32";
  }

  const fontSizeStyle = { fontSize: `${10}px` };

  // Limit to 6 steps, show "X more steps" if there are more
  const maxStepsToShow = 6;
  const stepsToDisplay =
    steps.length > maxStepsToShow
      ? [...steps.slice(0, maxStepsToShow - 1), `${steps.length - (maxStepsToShow - 1)} more history steps`]
      : steps;

  return (
    <ScrollArea className={`${heightClass} w-60 rounded-md border bg-white z-1`}>
      <div className="p-4">
        <h4 className="mb-4 font-medium leading-none">{scrollName}</h4>
        {stepsToDisplay.map((step, index) => (
          <React.Fragment key={index}>
            <div style={fontSizeStyle}>{step}</div>
            {index < stepsToDisplay.length - 1 && <Separator className="my-2" />}
          </React.Fragment>
        ))}
      </div>
    </ScrollArea>
  );
}
