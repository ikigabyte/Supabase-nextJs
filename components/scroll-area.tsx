import * as React from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

export function ScrollAreaDemo({ historySteps, scrollName }: { historySteps?: string[], scrollName?: string }) {
  const steps = historySteps ??  ["No history steps available"];
  // console.log("this is the history", steps);
  return (
    <ScrollArea className="h-72 w-48 rounded-md border bg-white text-[10px]">
      <div className="p-4">
        <h4 className="mb-4 text-sm font-medium leading-none">{scrollName}</h4>
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className="">{step}</div>
            <Separator className="my-2" />
          </React.Fragment>
        ))}
      </div>
    </ScrollArea>
  );
}
