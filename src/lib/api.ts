import { client } from '@/sanity/client'
import {
  allPostsQuery,
  postBySlugQuery,
  allPostSlugsQuery,
  allCategoriesQuery,
  postsByCategoryQuery,
  categoryBySlugQuery,
  searchPostsQuery,
} from '@/sanity/queries'
import { Post } from '@/interfaces/post'

export async function getAllPosts(): Promise<Post[]> {
  return await client.fetch(allPostsQuery)
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  return await client.fetch(postBySlugQuery, { slug })
}

export async function getAllPostSlugs(): Promise<{ slug: string }[]> {
  return await client.fetch(allPostSlugsQuery)
}

export async function getAllCategories() {
  return await client.fetch(allCategoriesQuery)
}

export async function getPostsByCategory(slug: string): Promise<Post[]> {
  return await client.fetch(postsByCategoryQuery, { slug })
}

export async function getCategoryBySlug(slug: string) {
  return await client.fetch(categoryBySlugQuery, { slug })
}

export async function searchPosts(query: string): Promise<Post[]> {
  const searchTerm = `*${query}*`
  return await client.fetch(searchPostsQuery, { query: searchTerm })
}

