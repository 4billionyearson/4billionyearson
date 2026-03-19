import { groq } from 'next-sanity'

export const allPostsQuery = groq`
  *[_type == "post"] | order(date desc) {
    _id,
    title,
    "slug": slug.current,
    excerpt,
    date,
    "coverImage": coverImage.asset->url,
    "author": author-> {
      name,
      "picture": picture.asset->url
    },
    "category": category-> {
      title,
      "slug": slug.current,
      accentColor
    }
  }
`

export const postBySlugQuery = groq`
  *[_type == "post" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    excerpt,
    date,
    "coverImage": coverImage.asset->url,
    "author": author-> {
      name,
      "picture": picture.asset->url
    },
    "category": category-> {
      title,
      "slug": slug.current,
      accentColor
    },
    body,
    htmlBody,
    seoTitle,
    seoDescription
  }
`

export const allPostSlugsQuery = groq`
  *[_type == "post"] { "slug": slug.current }
`

export const allCategoriesQuery = groq`
  *[_type == "category"] | order(title asc) {
    _id,
    title,
    "slug": slug.current,
    description,
    graphic,
    accentColor
  }
`

export const postsByCategoryQuery = groq`
  *[_type == "post" && category->slug.current == $slug] | order(date desc) {
    _id,
    title,
    "slug": slug.current,
    excerpt,
    date,
    "coverImage": coverImage.asset->url,
    "author": author-> {
      name,
      "picture": picture.asset->url
    }
  }
`

export const categoryBySlugQuery = groq`
  *[_type == "category" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    description,
    graphic,
    accentColor
  }
`

export const searchPostsQuery = groq`
  *[_type == "post" && (title match $query || excerpt match $query || pt::text(body) match $query)] | order(date desc) {
    _id,
    title,
    "slug": slug.current,
    excerpt,
    date,
    "coverImage": coverImage.asset->url,
    "author": author-> {
      name,
      "picture": picture.asset->url
    },
    "category": category-> {
      title,
      "slug": slug.current,
      accentColor
    }
  }
`
