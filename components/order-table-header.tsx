import React from "react";
import { TableHead, TableRow, TableHeader } from "@/components/ui/table";

const widths: string[] = ["20%", "5%", "5%", "5%", "5%", "5%", "5%", "9%", "9%", "6%", "15%", "5%"];

const laminationHeaderColors = {
  "matte" : "bg-purple-500",
  "gloss" : "bg-blue-500",
}
export function OrderTableHeader({ tableHeaders, keyName }: { tableHeaders: string[]; keyName: string }) {

  var laminationColor = ''

  // console.log("this is the keyName", keyName)
  // const lowerCase
  const split = keyName.split("-");
  // console.log("this is the split", split)

  if (split.includes("matte") || split.includes("gloss")) {
    // console.log("this has the matte or gloss thing hewre")
    const laminationType = split[split.length - 2];
    // console.log("this is the lamination type", laminationType)
    laminationColor = laminationHeaderColors[laminationType as keyof typeof laminationHeaderColors];
    // laminationColor = laminationHeaderColors[split[split.length - 1] as keyof typeof laminationHeaderColors];
    // console.log("this is the lamination color", laminationColor)
  }
  // if (keyName.includes("matte") || keyName.includes("gloss")) {
  //   console.log("this has the matte or gloss thing hewre")
    
  // }

  // // const split = keyName.split("-");
  // // console.log("this is the split", split)
  // // const laminationType = split[split.length - 1];
  // // // const hasLamination = laminationType == "matte" || laminationType == "gloss";
  // // const hasLamination = false
  // // console.log(laminationType)
  // var hasLamination = false;
  // // const hasLamination = laminationType.includes("matte") || tableHeaders.includes("gloss");
  // // console.log(hasLamination)
  // if (hasLamination) {
    
  //   const split = keyName.split("-");
  //   // const laminationType = split[split.length - 1];
  //   laminationColor = laminationHeaderColors[laminationType as keyof typeof laminationHeaderColors];
  //   // laminationColor = laminationHeaderColors[keyName[0]];
  // }
  // console.log(laminationColor);
  return (
    <TableHeader>
      <TableRow className="h-.5 [&>th]:py-0 text-xs bg-gray-500 hover:bg-gray-500">
        {widths.map((w, index) => (
          // console.log("this is the key", keyName),
          <TableHead
            key={index}
            className={
              `border-r border-gray-200 text-white ${
                tableHeaders[index]?.toLowerCase() === 'lamination' && laminationColor
                  ? laminationColor
                  : ''
              }`
            }
            style={{ width: w }}>
            {tableHeaders[index]
              ? tableHeaders[index].charAt(0).toUpperCase() + tableHeaders[index].slice(1)
              : ""}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}