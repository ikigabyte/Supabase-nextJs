"use client";

import { TableCell, TableBody, TableRow } from "./ui/table";
import { Eye } from "lucide-react";
import { Button } from "./ui/button";

const openZendeskTicket = (orderId: string) => {
  const url = `https://stickerbeat.zendesk.com/agent/tickets/${orderId}`;
  window.open(url, "_blank");
};

interface CompletedOrganizerProps {
  orders: any[] | null;
}

export function CompletedOrganizer({ orders }: CompletedOrganizerProps) {
  return (
    <>
      <TableBody>
        {orders?.map((order) => (
          <TableRow key={order.name_id} className="hover:bg-gray-50 text-xs">
            <TableCell>{order.name_id}</TableCell>
            <TableCell>{order.shape}</TableCell>
            <TableCell>{order.lamination}</TableCell>
            <TableCell>{order.material}</TableCell>
            <TableCell>{order.quantity}</TableCell>
            <TableCell>{order.ink}</TableCell>
            <TableCell>{order.print_method}</TableCell>
            <TableCell>{order.due_date}</TableCell>
            <TableCell>{order.ihd_date}</TableCell>
            <TableCell>{order.shipping_method}</TableCell>
            <TableCell>{order.notes}</TableCell>
            <Button className="bg-transparent" onClick={() => openZendeskTicket(order.order_id)}>
              <Eye className="mr-3 text-black" />
            </Button>
          </TableRow>
        ))}
      </TableBody>
    </>
  );
}
