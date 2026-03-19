import { type Author } from "./author";

export type Post = {
  slug: string;
  title: string;
  date: string;
  coverImage: string;
  author: Author;
  category?: {
    title: string;
    slug: string;
    accentColor?: string;
  };
  excerpt: string;
  ogImage?: {
    url: string;
  };
  body: any;
  htmlBody?: string;
  preview?: boolean;
  seoTitle?: string;
  seoDescription?: string;
};
