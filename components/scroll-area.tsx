import * as React from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

export function ScrollAreaDemo({ historySteps, scrollName }: { historySteps?: string[], scrollName?: string }) {
  const stepsExist = historySteps && historySteps.length > 0;
  const steps = stepsExist ? historySteps : ["No history available"];
  // const textSize = stepsExist ? "text-[10px]" : "text-[8px]";
  // console.log("this is the history", steps);

  const uniformFontSize = Math.max(14 - steps.length, 8); // Ensure minimum font size of 6px
  const fontSizeStyle = { fontSize: `${uniformFontSize}px` };
  return (
    <ScrollArea className="h-72 w-48 rounded-md border bg-white z-1">
      <div className="p-4">
        
        <h4 className="mb-4 font-medium leading-none">{scrollName}</h4>
        {steps.map((step, index) => {
          // `const fontSize = Math.max(12 - index, 6);`
          return (
            <React.Fragment key={index}>
              <div style={fontSizeStyle}>{step}</div>
              <Separator className="my-2" />
            </React.Fragment>
          );
        })}
      </div>
    </ScrollArea>
  );
}
