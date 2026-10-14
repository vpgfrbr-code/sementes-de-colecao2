import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center py-12">
      <SignUp
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
