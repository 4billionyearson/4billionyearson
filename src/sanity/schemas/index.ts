import { postType } from './postType'
import { authorType } from './authorType'
import { pageType } from './pageType'
import { categoryType } from './categoryType'

export const schemaTypes = [postType, authorType, pageType, categoryType]

// For compatibility with sanity.config.ts
export const schema = {
  types: schemaTypes,
}
