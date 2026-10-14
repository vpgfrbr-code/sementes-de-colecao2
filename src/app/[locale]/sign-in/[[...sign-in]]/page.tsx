import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center py-12">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-none border border-border/50 rounded-2xl",
          },
        }}
      />
    </section>
  );
}
