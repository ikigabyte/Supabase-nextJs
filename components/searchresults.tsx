'use client'

import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Table, TableBody, TableRow, TableCell, TableHead, TableHeader } from '@/components/ui/table'
import type { Order } from '@/types/custom'

export default function SearchResults({ initialQuery }: { initialQuery: string }) {
  const [orders, setOrders] = useState<Order[] | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (!initialQuery) {
      setOrders([])
      return
    }
    supabase
      .from('orders')
      .select('*')
      .eq('order_id', parseInt(initialQuery, 10))
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching orders:', error)
          setOrders([])
        } else {
          setOrders(data)
        }
      })
  }, [initialQuery, supabase])

  if (orders === null) {
    return <p>Loading...</p>
  }
  if (orders.length === 0) {
    return <p>No orders found for "{initialQuery}".</p>
  }
  return (
    <Table className="mb-4 w-full table-fixed">
      <TableHead>
        <TableRow className="[&>th]:py-0 text-xs">
          <TableHeader>Name ID</TableHeader>
          <TableHeader>Production Status</TableHeader>
          <TableHeader>Order ID</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.name_id} className="[&>td]:py-0 text-xs">
            <TableCell>{order.name_id}</TableCell>
            <TableCell>{order.production_status}</TableCell>
            <TableCell>{order.order_id}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
