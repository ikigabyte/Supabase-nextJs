import * as React from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

export function ScrollAreaDemo({ historySteps }: { historySteps?: string[] }) {
  const steps = historySteps || ["No history available"];

  return (
    <ScrollArea className="h-72 w-48 rounded-md border opacity-100 bg-white z-50">
      <div className="p-4">
        <h4 className="mb-4 text-sm font-medium leading-none">History</h4>
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className="text-sm">{step}</div>
            <Separator className="my-2" />
          </React.Fragment>
        ))}
      </div>
    </ScrollArea>
  );
}
