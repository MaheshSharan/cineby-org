export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  author: {
    name: string;
    role: string;
    avatar?: string;
  };
  tags: string[];
  coverImage: string;
  readTimeMinutes: number;
}

export interface BlogPost extends BlogPostMeta {
  content: string;
}
