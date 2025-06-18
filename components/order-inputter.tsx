import React from "react";
import { Input } from "@/components/ui/input";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
const widths: string[] = ["18%", "4%", "4%", "5%", "5%", "5%", "5%", "6%", "6%", "6%", "25%", "5%"];

const laminationHeaderColors = {
  matte: "bg-purple-500",
  gloss: "bg-blue-500",
};
export function OrderInputter({
  tableHeaders,
  onSubmit,
}: {
  tableHeaders: string[];
  onSubmit: (values: Record<string, string>) => void;
}) {
  const headers = tableHeaders.map((header) => header.toLowerCase());

  // Helper to uppercase the first letter
  const capitalizeFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
  const [inputs, setInputs] = React.useState<Record<string, string>>(() =>
    tableHeaders.reduce((acc, header) => {
      acc[header] = "";
      return acc;
    }, {} as Record<string, string>)
  );
  const [error, setError] = React.useState<string>("");

  const handleChange = (header: string, value: string) => {
    setInputs((prev) => ({
      ...prev,
      [header]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const requiredHeaders = headers.filter(
      (header) => header.toLowerCase() === "name id" || header.toLowerCase() === "order id"
    );
    const allFilled = requiredHeaders.every((header) => inputs[header]?.trim() !== "");
    // onSubmit(inputs);

    if (allFilled) {
      console.log("Submitting order with inputs:", inputs);
      // setError("");
      onSubmit(inputs);
      // Reset all inputs after successful submission
      setInputs(
        headers.reduce((acc, header) => {
          acc[header] = "";
          return acc;
        }, {} as Record<string, string>)
      );
    } else {
      setError("Please fill in both Name ID and Order ID before submitting an order");
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div className="mb-4 text-yellow-700 bg-yellow-100 p-2 rounded">
          ⚠️ Only use the following if you want to create a custom Order. Please note that the order ID you attach it to
          will sync across zendesk.
        </div>
        <Table>
          <TableBody>
            <TableRow>
              {headers.map((header, idx) => (
                <TableCell key={idx}>
                  <Input
                    placeholder={capitalizeFirst(header)}
                    value={inputs[header]}
                    onChange={(e) => handleChange(header, e.target.value)}
                  />
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
        <Button className="rounded-none w-full" type="submit">
          Submit Custom Order
        </Button>
        {error && <div className="text-red-500 mt-2">{error}</div>}
      </form>
      <Separator className="w-full mb-8" />
    </div>
  );
}
