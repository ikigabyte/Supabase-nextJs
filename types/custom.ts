import { Database } from "./supabase";

// export type Todo = Database["public"]["Tables"]["todos"]["Row"] // Everyhting is returned from the database

export type Order = Database["public"]["Tables"]["orders"]["Row"] // Everyhting is returned from the database
export type History = Database["public"]["Tables"]["history"]["Row"] // Everyhting is returned from the database
export type TimelineOrder = Database["public"]["Tables"]["timeline"]["Row"] // Everyhting is returned from the database