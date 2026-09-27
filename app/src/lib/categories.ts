// Readable names for job categories (the API sends codes like APP_TESTING)
export const CATEGORY_LABELS: Record<string, string> = {
  SOCIAL_MEDIA: 'Social media', DATA_ENTRY: 'Data entry', CONTENT_WRITING: 'Content writing',
  APP_TESTING: 'App testing', SURVEY: 'Survey', DESIGN: 'Design', TRANSLATION: 'Translation',
  WEB_RESEARCH: 'Web research', VIDEO_REVIEW: 'Video review', OTHER: 'General',
}

export const categoryLabel = (code?: string | null) =>
  (code && CATEGORY_LABELS[code]) || (code ? code.charAt(0) + code.slice(1).toLowerCase().replace(/_/g, ' ') : 'General')
