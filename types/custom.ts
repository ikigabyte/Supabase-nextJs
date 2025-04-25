import { Database } from "./supabase";

export type Todo = Database["public"]["Tables"]["todos"]["Row"] // Everyhting is returned from the database

export type Order = Database["public"]["Tables"]["orders"]["Row"] // Everyhting is returned from the database