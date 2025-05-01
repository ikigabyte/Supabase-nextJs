import { redirect } from "next/navigation";

export default function Home() {
  const userLoggedIn = false; // Replace with actual user authentication logic

  if (userLoggedIn) {
    redirect("/toprint");
  } else {
    redirect("/login");
  }

  return null;
}
