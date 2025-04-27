import React from "react";
// in components/order-table.tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { OrderTableHeader } from "./order-table-header";

export type RowData = {
  col1: string;
  col2: string;
  col3: string;
  col4: string;
  col5: string;
  col6: string;
  col7: string;
  col8: string;
  col9: string;
};

export function OrderColumnTable(data : RowData[]) {
  console.log("the data is ", data);
  return (
    <Table>
    <OrderTableHeader />
      <TableBody>
        {[...Array(5)].map((_, i) => (
          <TableRow key={i}>
            <TableCell>test</TableCell>
            <TableCell>test</TableCell>
            <TableCell>test</TableCell>
            <TableCell>test</TableCell>
            <TableCell>test</TableCell>
            <TableCell>test</TableCell>
            <TableCell>test</TableCell>
            <TableCell>test</TableCell>
            <TableCell></TableCell>
            <TableCell>
              <Input value="testing" readOnly />
            </TableCell>
            <TableCell className="text-center">
              <Checkbox checked={false} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}