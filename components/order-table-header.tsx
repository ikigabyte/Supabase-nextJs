import React from "react";
import { TableHead, TableRow, TableHeader } from "@/components/ui/table";

const widths: string[] = ["18%", "4%", "4%", "5%", "5%", "5%", "5%", "6%", "6%", "6%", "25%", "5%"];

// const laminationHeaderColors = {
//   matte: "bg-purple-500",
//   gloss: "bg-blue-500",
// };
export function OrderTableHeader({
  tableHeaders,
  ignoreAssignee
}: {
    tableHeaders: string[];
    ignoreAssignee?: boolean;
}) {
  var laminationColor = "";
  // console.log("Table Headers:", tableHeaders);
  // Add an extra header if productionStatus is 'print'
  let headers = ["#", ...tableHeaders];
  let headerWidths = ["1%", ...widths];

  if (!ignoreAssignee) {
    headers = [...headers.slice(0, 10), "ASSIGNEE", ...headers.slice(10)];

    // Find the index of the 25% width and reduce it by 3%
    const widthsCopy = [...headerWidths];
    const idx25 = widthsCopy.findIndex((w) => w === "25%");
    if (idx25 !== -1) {
      widthsCopy[idx25] = "23%";
    }
    headerWidths = [...widthsCopy.slice(0, 6), "2%", ...widthsCopy.slice(6)];
  }

  return (
    <TableHeader>
      <TableRow className="h-.5 [&>th]:py-0 text-xs bg-gray-500 hover:bg-gray-500">
        {headerWidths.map((w, index) => (
          <TableHead
            key={index}
            className={`border-r border-gray-200 font-bold text-white truncate text-[11px]${
              headers[index]?.toLowerCase() === "lamination" && laminationColor ? laminationColor : ""
            }${index === 0 ? " text-center" : ""}`}
            style={{ width: w }}
          >
            {headers[index]
              ? headers[index].toUpperCase() === "CUT"
                ? "CUT"
                : headers[index].toUpperCase() === "ZENDESK"
                ? "ZENDESK"
                : index === headers.length - 1
                ? headers[index].toUpperCase() + "ED"
                : headers[index].toUpperCase()
              : ""}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}
