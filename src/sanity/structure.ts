import type { StructureResolver } from 'sanity/structure'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Blog Posts')
        .child(S.documentTypeList('post').title('Blog Posts')),
      S.listItem()
        .title('Pages')
        .child(S.documentTypeList('page').title('Pages')),
      S.listItem()
        .title('Categories')
        .child(S.documentTypeList('category').title('Categories')),
      S.listItem()
        .title('Authors')
        .child(S.documentTypeList('author').title('Authors')),
    ])
