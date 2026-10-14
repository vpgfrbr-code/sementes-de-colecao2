// Alias route: /produtos/[slug] renders the same content as /produto/[slug].
// Re-exports default page + generateMetadata from the canonical singular route
// so shared/legacy plural URLs don't 404.
export { default, generateMetadata } from "../../produto/[slug]/page";
