import type { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";
import Image from "next/image";
import { Streamdown } from "streamdown";

import { PageSeo } from "@/components/seo/PageSeo";
import { getAllPosts, getPostBySlug } from "@/lib/blog/posts";
import type { BlogPost } from "@/lib/blog/types";
import { buildBlogPostJsonLd, sanitizeJsonLd } from "@/lib/seo/jsonLd";

interface BlogPostPageProps {
  post: BlogPost;
  relatedPosts: BlogPost[];
}

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = getAllPosts();
  return {
    paths: posts.map((p) => ({ params: { slug: p.slug } })),
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps<BlogPostPageProps, { slug: string }> = async (context) => {
  const slug = context.params?.slug;
  if (!slug) return { notFound: true };

  const post = getPostBySlug(slug);
  if (!post) return { notFound: true };

  const allPosts = getAllPosts();
  const relatedPosts = allPosts
    .filter((p) => p.slug !== slug)
    .slice(0, 2)
    .map((p) => getPostBySlug(p.slug)!)
    .filter(Boolean);

  return {
    props: {
      post,
      relatedPosts,
    },
    revalidate: 86400,
  };
};

export default function BlogPostPage({ post, relatedPosts }: BlogPostPageProps) {
  const jsonLd = sanitizeJsonLd(buildBlogPostJsonLd(post));

  return (
    <>
      <PageSeo
        title={`${post.title} | Cineby Editorial`}
        description={post.description}
        path={`/blog/${post.slug}`}
        imageUrl={post.coverImage}
        jsonLd={jsonLd}
      />

      <article className="min-h-screen px-4 pt-24 pb-20 sm:px-6 sm:pt-28 md:px-8 max-w-4xl mx-auto">
        {/* Back Link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-xs font-semibold text-white/50 hover:text-white transition-colors mb-6 group"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="group-hover:-translate-x-0.5 transition-transform"
          >
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to all guides
        </Link>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-lg bg-white/[0.08] px-3 py-1 text-xs font-semibold text-white/80 border border-white/10"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Article Headline */}
        <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-white tracking-tight leading-tight sm:leading-tight">
          {post.title}
        </h1>

        {/* E-E-A-T Author & Metadata Box */}
        <div className="mt-6 py-4 px-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 rounded-full overflow-hidden border border-white/20 bg-white/10 shadow-sm flex-shrink-0">
              <Image
                src={post.author.avatar || "/avatar/classic-1.png"}
                alt={post.author.name}
                fill
                sizes="44px"
                className="object-cover"
              />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                <span>{post.author.name}</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 font-medium">
                  Verified Curator
                </span>
              </div>
              <div className="text-[11px] text-white/50">{post.author.role}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-white/50">
            <time dateTime={post.publishedAt} className="flex items-center gap-1.5">
              <span>Published: {post.publishedAt}</span>
            </time>
            <span>•</span>
            <span>{post.readTimeMinutes} min read</span>
          </div>
        </div>

        {/* Cover Image */}
        <div className="relative mt-8 aspect-video w-full overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl shadow-black/80">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            priority
            sizes="(max-width: 896px) 100vw, 896px"
            className="object-cover"
          />
        </div>

        {/* Article Body Rendered via Streamdown */}
        <div className="mt-10 streamdown-container prose prose-invert max-w-none text-white/80 leading-relaxed">
          <Streamdown>{post.content}</Streamdown>
        </div>

        {/* Related Guides */}
        {relatedPosts.length > 0 && (
          <div className="mt-16 pt-10 border-t border-white/10">
            <h3 className="text-xl font-bold text-white mb-6">More Recommended Guides from Cineby</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedPosts.map((rel) => (
                <Link
                  key={rel.slug}
                  href={`/blog/${rel.slug}`}
                  className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/20 transition-all group"
                >
                  <div className="text-xs text-white/40 mb-1.5 font-medium">{rel.tags[0]}</div>
                  <div className="text-sm sm:text-base font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-2">
                    {rel.title}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </>
  );
}
