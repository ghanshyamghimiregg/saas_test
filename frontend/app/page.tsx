import { redirect } from "next/navigation";
// Root "/" redirects to login. Middleware handles subdomain → app routing.
export default function RootPage() {
  redirect("/login");
}
