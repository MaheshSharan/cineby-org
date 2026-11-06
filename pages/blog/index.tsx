import type { GetStaticProps } from "next";
import { useState } from "react";

import { PageSeo } from "@/components/seo/PageSeo";
import { BlogCard } from "@/components/blog/BlogCard";
import { NativeBannerAd } from "@/components/ads/NativeBannerAd";
import { getAllPosts, getAllTags } from "@/lib/blog/posts";
import type { BlogPostMeta } from "@/lib/blog/types";
import { sanitizeJsonLd } from "@/lib/seo/jsonLd";
import { buildAbsoluteUrl, SITE_NAME } from "@/lib/seo/site";

interface BlogIndexProps {
  posts: BlogPostMeta[];
  tags: string[];
}

export const getStaticProps: GetStaticProps<BlogIndexProps> = async () => {
  const posts = getAllPosts();
  const tags = getAllTags();
  return {
    props: {
      posts,
      tags,
    },
    revalidate: 86400,
  };
};

export default function BlogIndexPage({ posts, tags }: BlogIndexProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const featuredPost = posts[0];
  const otherPosts = posts.slice(1);

  const filteredPosts = selectedTag
    ? posts.filter((p) => p.tags.includes(selectedTag))
    : otherPosts;

  const jsonLd = sanitizeJsonLd({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Cineby Editorial & Streaming Guides",
    description: "Curated movie recommendations, buffering troubleshooting, and streaming culture from Cineby.",
    url: buildAbsoluteUrl("/blog"),
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: buildAbsoluteUrl("/logo.png"),
      },
    },
  });

  return (
    <>
      <PageSeo
        title="Cineby Blog: Expert Movie Guides & Streaming Tips"
        description="Discover expert streaming recommendations, tech guides, buffering fixes, and deep dives into upcoming cinema releases on Cineby."
        path="/blog"
        jsonLd={jsonLd}
      />

      <div className="min-h-screen px-4 pt-24 pb-20 sm:px-6 sm:pt-28 md:px-8 lg:px-12 max-w-7xl page-shell">
        {/* Header Hero */}
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-xs text-white/80 font-medium mb-4 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Cineby Editorial & Guides
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
            Stories, Recommendations & Streaming Science
          </h1>
          <p className="mt-4 text-sm sm:text-base text-white/60 leading-relaxed max-w-2xl">
            Curated film analysis, tech guides for high-bitrate streaming, and in-depth roundups from the Cineby team.
          </p>

          {/* Tags Filter */}
          <div className="mt-8 -mx-4 flex flex-nowrap items-center gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedTag === null
                  ? "bg-white text-black shadow-lg shadow-white/10"
                  : "bg-white/[0.05] text-white/60 hover:text-white border border-white/10"
              }`}
            >
              All Topics
            </button>
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedTag === tag
                    ? "bg-white text-black shadow-lg shadow-white/10"
                    : "bg-white/[0.05] text-white/60 hover:text-white border border-white/10"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Featured Post (shown when no tag filter is active) */}
        {!selectedTag && featuredPost && (
          <div className="mb-8">
            <BlogCard post={featuredPost} featured={true} />
          </div>
        )}

        {/* In-Feed Native Banner */}
        <div className="my-8">
          <NativeBannerAd />
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredPosts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </>
  );
}
