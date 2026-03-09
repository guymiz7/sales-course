export interface SocialLinks {
  google_review_url?: string | null
  facebook_page_url?: string | null
  facebook_follow_url?: string | null
  linkedin_url?: string | null
  youtube_url?: string | null
  tiktok_url?: string | null
  autotuesday_url?: string | null
}

// The main "recommend" button (Google review)
export const RECOMMEND_PLATFORM = {
  key: 'google_review_url' as keyof SocialLinks,
  label: 'המלץ על גיא',
  domain: 'google.com',
}

// "Follow" platforms shown as favicon icons
export const FOLLOW_PLATFORMS = [
  { key: 'facebook_page_url' as keyof SocialLinks, label: 'פייסבוק', domain: 'facebook.com' },
  { key: 'facebook_follow_url' as keyof SocialLinks, label: 'פייסבוק', domain: 'facebook.com' },
  { key: 'linkedin_url' as keyof SocialLinks, label: 'לינקדאין', domain: 'linkedin.com' },
  { key: 'youtube_url' as keyof SocialLinks, label: 'יוטיוב', domain: 'youtube.com' },
  { key: 'tiktok_url' as keyof SocialLinks, label: 'טיקטוק', domain: 'tiktok.com' },
  { key: 'autotuesday_url' as keyof SocialLinks, label: 'Auto Tuesday', domain: 'autotuesday.com' },
]

// All platforms combined (for backwards compat)
export const RECOMMEND_PLATFORMS = [RECOMMEND_PLATFORM, ...FOLLOW_PLATFORMS]
