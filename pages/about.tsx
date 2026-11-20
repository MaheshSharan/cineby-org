import { AboutContent } from "@/components/about/AboutContent";
import { PageSeo } from "@/components/seo/PageSeo";
import { buildAboutPageJsonLd, sanitizeJsonLd } from "@/lib/seo/jsonLd";
import { getSiteHost } from "@/lib/seo/site";

export default function AboutPage() {
  return (
    <>
      <PageSeo
        title="About Cineby - Official Website of Cineby"
        description={`Cineby is a movie and TV discovery platform. The earlier sites shut down in August 2026 and Cineby relaunched in November 2026 at ${getSiteHost()}, its official home.`}
        path="/about"
        jsonLd={sanitizeJsonLd(buildAboutPageJsonLd())}
      />
      <AboutContent />
    </>
  );
}
