import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function ConfiguracoesLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { userId } = await auth();
  const { locale } = await params;

  if (!userId) {
    redirect(`/${locale}/sign-in`);
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const role = (user.publicMetadata as { role?: string })?.role;

  if (role !== "superadmin") {
    redirect(`/${locale}/admin`);
  }

  return <>{children}</>;
}
