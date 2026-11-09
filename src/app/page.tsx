import { redirect } from "next/navigation";

// La racine du site mène à l'administration (protégée par mot de passe).
// Vos clients, eux, ne reçoivent que des liens /c/{catalogue}.
export default function Home() {
  redirect("/admin");
}
