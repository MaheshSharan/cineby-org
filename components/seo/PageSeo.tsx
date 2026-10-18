import Head from "next/head";

import { buildAbsoluteUrl, DEFAULT_OG_IMAGE_PATH, SITE_NAME } from "@/lib/seo/site";

type OpenGraphType = "website" | "video.movie" | "video.tv_show";

interface IndexablePageSeoProps {
  title: string;
  description: string;
  /** Canonical path without query string, e.g. "/movie/1726-iron-man". */
  path: string;
  /** Absolute image URL for link previews. Defaults to the site preview image. */
  imageUrl?: string | null;
  imageWidth?: number;
  imageHeight?: number;
  openGraphType?: OpenGraphType;
  /** Sanitized JSON-LD payload to embed in <head>. Must be pre-sanitized via sanitizeJsonLd per AGENTS.md §18. */
  jsonLd?: string;
  noindex?: false;
}

interface NoindexPageSeoProps {
  title: string;
  noindex: true;
}

type PageSeoProps = IndexablePageSeoProps | NoindexPageSeoProps;

export function PageSeo(props: PageSeoProps) {
  if (props.noindex) {
    return (
      <Head>
        <title>{props.title}</title>
        <meta key="robots" name="robots" content="noindex, nofollow" />
      </Head>
    );
  }

  const {
    title,
    description,
    path,
    imageUrl,
    imageWidth = 1280,
    imageHeight = 720,
    openGraphType = "website",
  } = props;
  const canonicalUrl = buildAbsoluteUrl(path);
  const previewImageUrl = imageUrl ?? buildAbsoluteUrl(DEFAULT_OG_IMAGE_PATH);

  return (
    <Head>
      <title>{title}</title>
      <meta key="description" name="description" content={description} />
      <link key="canonical" rel="canonical" href={canonicalUrl} />
      <meta key="og:site_name" property="og:site_name" content={SITE_NAME} />
      <meta key="og:type" property="og:type" content={openGraphType} />
      <meta key="og:title" property="og:title" content={title} />
      <meta key="og:description" property="og:description" content={description} />
      <meta key="og:url" property="og:url" content={canonicalUrl} />
      <meta key="og:image" property="og:image" content={previewImageUrl} />
      <meta key="og:image:secure_url" property="og:image:secure_url" content={previewImageUrl} />
      <meta key="og:image:type" property="og:image:type" content="image/jpeg" />
      <meta key="og:image:width" property="og:image:width" content={String(imageWidth)} />
      <meta key="og:image:height" property="og:image:height" content={String(imageHeight)} />
      <meta key="twitter:card" name="twitter:card" content="summary_large_image" />

      <meta key="twitter:title" name="twitter:title" content={title} />
      <meta key="twitter:description" name="twitter:description" content={description} />
      <meta key="twitter:image" name="twitter:image" content={previewImageUrl} />
      {props.jsonLd ? (
        <script
          key="json-ld"
          type="application/ld+json"
          // Documented security reason: Schema.org structured data requires raw JSON in application/ld+json.
          // Sanitized against closing tag XSS injections via sanitizeJsonLd() per AGENTS.md §18.
          dangerouslySetInnerHTML={{ __html: props.jsonLd }}
        />
      ) : null}
    </Head>
  );
}
