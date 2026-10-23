import { redirect } from "next/navigation";

export default function Home() {
  // Middleware manda quem já tem sessão para /catalogo.
  redirect("/login");
}
