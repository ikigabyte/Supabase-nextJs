import React from "react";
import { TableHead, TableRow, TableHeader } from "@/components/ui/table";

const widths: string[] = ["18%", "4%", "4%", "5%", "5%", "5%", "5%", "6%", "6%", "6%", "25%", "5%"];

// const laminationHeaderColors = {
//   matte: "bg-purple-500",
//   gloss: "bg-blue-500",
// };
export function OrderTableHeader({
  tableHeaders,
  productionStatus = "",
}: {
  tableHeaders: string[];
  productionStatus?: string;
}) {
  var laminationColor = "";
  // console.log("Table Headers:", tableHeaders);
  // Add an extra header if productionStatus is 'print'
  let headers = tableHeaders;
  let headerWidths = widths;

  if (productionStatus && productionStatus === "print") {
    headers = [...tableHeaders.slice(0, 9), "ASIGNEE", ...tableHeaders.slice(9)];

    // Find the index of the 25% width and reduce it by 3%
    const widthsCopy = [...widths];
    const idx25 = widthsCopy.findIndex((w) => w === "25%");
    if (idx25 !== -1) {
      widthsCopy[idx25] = "23%";
    }
    headerWidths = [...widthsCopy.slice(0, 5), "2%", ...widthsCopy.slice(5)];
  }

  return (
    <TableHeader>
      <TableRow className="h-.5 [&>th]:py-0 text-xs bg-gray-500 hover:bg-gray-500">
        {headerWidths.map((w, index) => (
          <TableHead
            key={index}
            className={`border-r border-gray-200 font-bold text-white truncate text-[11px]${
              headers[index]?.toLowerCase() === "lamination" && laminationColor ? laminationColor : ""
            }`}
            style={{ width: w }}
          >
            {headers[index] ? headers[index].toUpperCase() : ""}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}
