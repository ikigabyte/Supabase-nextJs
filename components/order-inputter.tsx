import React from "react";
import { Input } from "@/components/ui/input";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Label } from "@/components/ui/label"

const widths: string[] = ["18%", "4%", "4%", "5%", "5%", "5%", "5%", "6%", "6%", "6%", "25%", "5%"];

const laminationHeaderColors = {
  matte: "bg-purple-500",
  gloss: "bg-blue-500",
};

function ProfileForm({
  className,
  onSubmit,
}: React.ComponentProps<"form"> & {
  onSubmit: (data: {
    order_id: string;
    due_date: string; // YYYY-MM-DD
    ihd_date: string; // YYYY-MM-DD
    entries: { name_id: string; lamination: string; material: string; quantity: number }[];
  }) => void;
}) {
  const [orderId, setOrderId] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [ihdDate, setIhdDate] = React.useState("");

  type Row = { name_id: string; lamination: string; material: string; quantity: number };
  const blankRow: Row = { name_id: "", lamination: "", material: "", quantity: 1 };
  const [rows, setRows] = React.useState<Row[]>([blankRow]);

  const addRow = () => setRows((r) => [...r, { ...blankRow }]);
  const removeRow = (idx: number) =>
    setRows((r) => (r.length > 1 ? r.filter((_, i) => i !== idx) : r)); // keep at least 1

  const updateRow = <K extends keyof Row>(idx: number, key: K, value: Row[K]) =>
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, [key]: value } : row)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      order_id: orderId.trim(),
      due_date: dueDate,   // e.g., "2025-08-12"
      ihd_date: ihdDate,   // e.g., "2025-08-15"
      entries: rows,
    });
  };

  return (
    <form className={cn("grid items-start gap-6", className)} onSubmit={handleSubmit}>
      {/* Top-level fields */}
      <div className="grid gap-3">
        <Label htmlFor="orderId">Order Id</Label>
        <Input id="orderId" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
      </div>

      <div className="grid gap-3">
        <Label htmlFor="dueDate">Due date</Label>
        <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>

      <div className="grid gap-3">
        <Label htmlFor="ihdDate">IHD date</Label>
        <Input id="ihdDate" type="date" value={ihdDate} onChange={(e) => setIhdDate(e.target.value)} />
      </div>

      {/* Line items */}
      <div className="grid gap-2">
        <Label>Entries</Label>
        <Table>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell className="w-[35%]">
                  <Input
                    placeholder="Name ID"
                    value={row.name_id}
                    onChange={(e) => updateRow(idx, "name_id", e.target.value)}
                  />
                </TableCell>
                <TableCell className="w-[20%]">
                  <Input
                    placeholder="Lamination"
                    value={row.lamination}
                    onChange={(e) => updateRow(idx, "lamination", e.target.value)}
                  />
                </TableCell>
                <TableCell className="w-[20%]">
                  <Input
                    placeholder="Material"
                    value={row.material}
                    onChange={(e) => updateRow(idx, "material", e.target.value)}
                  />
                </TableCell>
                <TableCell className="w-[20%]">
                  <Input
                    placeholder="Qty"
                    value={row.quantity}
                    onChange={(e) => updateRow(idx, "quantity", Number(e.target.value || 0))}
                  />
                </TableCell>
                <TableCell className="w-[3%]">
                  <Button type="button" variant="ghost" onClick={() => removeRow(idx)}>
                    ✕
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Button type="button" variant="outline" onClick={addRow}>
          Add another entry
        </Button>
      </div>

      <Button type="submit">Submit Order</Button>
    </form>
  );
}

export function OrderInputter(props: { onSubmit: (data: any) => void }) {
  const [open, setOpen] = React.useState(false);

  // Add more fields as needed
  const handleSubmit = (data: any) => {
    // Pass along all values here
    props.onSubmit({
      ...data,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="form">Create Order</Button>
      </DialogTrigger>
      <DialogContent aria-description={undefined} className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Order</DialogTitle>
          <DialogDescription>
          Input your order details here.
          </DialogDescription>
          <DialogDescription>
          Please note that the order on Zendesk will move along with the progress of the order.
          </DialogDescription>
        </DialogHeader>
        <ProfileForm
          onSubmit={handleSubmit}
          className=""
        />
      </DialogContent>
    </Dialog>
  );
}

// export function extra({
//   tableHeaders,
//   onSubmit,
// }: {
//   tableHeaders: string[];
//   onSubmit: (values: Record<string, string>) => void;
// }) {
//   const headers = tableHeaders.map((header) => header.toLowerCase());

//   // Helper to uppercase the first letter
//   const capitalizeFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
//   const [inputs, setInputs] = React.useState<Record<string, string>>(() =>
//     tableHeaders.reduce((acc, header) => {
//       acc[header] = "";
//       return acc;
//     }, {} as Record<string, string>)
//   );
//   const [error, setError] = React.useState<string>("");

//   const handleChange = (header: string, value: string) => {
//     setInputs((prev) => ({
//       ...prev,
//       [header]: value,
//     }));
//   };

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     const requiredHeaders = headers.filter(
//       (header) => header.toLowerCase() === "name id" || header.toLowerCase() === "order id"
//     );
//     const allFilled = requiredHeaders.every((header) => inputs[header]?.trim() !== "");
//     // onSubmit(inputs);

//     if (allFilled) {
//       console.log("Submitting order with inputs:", inputs);
//       // setError("");
//       onSubmit(inputs);
//       // Reset all inputs after successful submission
//       setInputs(
//         headers.reduce((acc, header) => {
//           acc[header] = "";
//           return acc;
//         }, {} as Record<string, string>)
//       );
//     } else {
//       setError("Please fill in both Name ID and Order ID before submitting an order");
//     }
//   };

//   return (
//     <div>
//       <form onSubmit={handleSubmit}>
//         <Table>
//           <TableBody>
//             <TableRow>
//               {headers.map((header, idx) => (
//                 <TableCell key={idx}>
//                   <Input
//                     placeholder={capitalizeFirst(header)}
//                     value={inputs[header]}
//                     onChange={(e) => handleChange(header, e.target.value)}
//                   />
//                 </TableCell>
//               ))}
//             </TableRow>
//           </TableBody>
//         </Table>
//         <Button className="rounded-none w-full" type="submit">
//           Submit Custom Order
//         </Button>
//         {error && <div className="text-red-500 mt-2">{error}</div>}
//       </form>
//       <Separator className="w-full mb-8" />
//     </div>
//   );
// }
