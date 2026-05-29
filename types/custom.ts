import { Database } from "./supabase";

// export type Todo = Database["public"]["Tables"]["todos"]["Row"] // Everyhting is returned from the database

export type Order = Database["public"]["Tables"]["orders"]["Row"] // Everyhting is returned from the database
export type History = Database["public"]["Tables"]["history"]["Row"] // Everyhting is returned from the database
export type TimelineOrder = Database["public"]["Tables"]["tracking_orders"]["Row"] & {
  shipped_stamp?: string | null;
  ticket_status?: string | null;
} // Everyhting is returned from the database
