import { Database } from "./supabase";

export type Todo = Database["public"]["Tables"]["todos"]["Row"] // Everyhting is returned from the database