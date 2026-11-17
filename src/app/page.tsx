import { redirect } from "next/navigation";

/**
 * La racine du site mène à l'administration : sans session, le middleware
 * renvoie vers /admin/login. Vos clients, eux, ne reçoivent que des liens
 * /c/{catalogue}.
 */
export default function Home() {
  redirect("/admin");
}
