import Link from "next/link";
import Image from "next/image";
import type { BlogPostMeta } from "@/lib/blog/types";

interface BlogCardProps {
  post: BlogPostMeta;
  featured?: boolean;
}

export function BlogCard({ post, featured = false }: BlogCardProps) {
  if (featured) {
    return (
      <article className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-1 transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:shadow-black/70">
        <div className="flex flex-col md:flex-row gap-6 lg:gap-8 rounded-[22px] bg-[#0d0e12]/90 p-5 sm:p-7 backdrop-blur-md">
          {/* Featured Image */}
          <Link
            href={`/blog/${post.slug}`}
            className="relative aspect-[16/10] md:aspect-auto md:w-1/2 overflow-hidden rounded-2xl bg-white/5 flex-shrink-0"
          >
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
            <div className="absolute top-3 left-3 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-[11px] font-bold text-emerald-300 backdrop-blur-md">
              Featured Guide
            </div>
          </Link>

          {/* Featured Content */}
          <div className="flex flex-1 flex-col justify-center">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {post.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-lg bg-white/[0.08] px-2.5 py-0.5 text-xs font-semibold text-white/80 border border-white/10"
                >
                  {t}
                </span>
              ))}
              <span className="text-white/40 text-xs">• {post.readTimeMinutes} min read</span>
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white group-hover:text-emerald-300 transition-colors leading-tight">
              <Link href={`/blog/${post.slug}`}>{post.title}</Link>
            </h2>

            <p className="mt-3 text-sm sm:text-base text-white/60 leading-relaxed line-clamp-3">
              {post.description}
            </p>

            <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative h-8 w-8 rounded-full overflow-hidden border border-white/20 bg-white/10 flex-shrink-0">
                  <Image
                    src={post.author.avatar || "/avatar/classic-1.png"}
                    alt={post.author.name}
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">{post.author.name}</div>
                  <div className="text-[10px] text-white/50">{post.author.role}</div>
                </div>
              </div>

              <Link
                href={`/blog/${post.slug}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform"
              >
                <span>Read Full Guide</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d0e12]/80 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl hover:shadow-black/60">
      <Link href={`/blog/${post.slug}`} className="relative aspect-[16/10] w-full overflow-hidden bg-white/5">
        <Image
          src={post.coverImage}
          alt={post.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0e12] via-transparent to-transparent opacity-80" />

        {/* Read Time Badge */}
        <div className="absolute top-3 right-3 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-medium text-white/80 border border-white/10">
          {post.readTimeMinutes} min read
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10.5px] font-medium text-white/70 border border-white/5"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Title */}
        <h2 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-2 leading-snug">
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h2>

        {/* Description */}
        <p className="mt-2 text-xs sm:text-[13px] text-white/55 line-clamp-3 leading-relaxed flex-1">
          {post.description}
        </p>

        {/* Author / Date Info */}
        <div className="mt-5 pt-4 border-t border-white/[0.07] flex items-center justify-between text-xs text-white/45">
          <div className="flex items-center gap-2">
            <div className="relative h-6 w-6 rounded-full overflow-hidden border border-white/20 bg-white/10 flex-shrink-0">
              <Image
                src={post.author.avatar || "/avatar/classic-1.png"}
                alt={post.author.name}
                fill
                sizes="24px"
                className="object-cover"
              />
            </div>
            <span className="font-medium text-white/80">{post.author.name}</span>
          </div>
          <time dateTime={post.publishedAt} className="text-[11px]">
            {post.publishedAt}
          </time>
        </div>
      </div>
    </article>
  );
}
