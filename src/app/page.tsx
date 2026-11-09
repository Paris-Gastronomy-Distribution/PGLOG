import { notFound } from "next/navigation";

// La racine du site n'expose rien : seuls les liens /c/{slug} sont publics.
export default function Home() {
  notFound();
}
