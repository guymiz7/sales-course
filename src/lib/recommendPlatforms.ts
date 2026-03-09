export interface SocialLinks {
  google_review_url?: string | null
  facebook_page_url?: string | null
  facebook_follow_url?: string | null
  linkedin_url?: string | null
  youtube_url?: string | null
  tiktok_url?: string | null
  autotuesday_url?: string | null
}

export const RECOMMEND_PLATFORMS = [
  { key: 'google_review_url' as keyof SocialLinks, label: 'המלץ בגוגל', domain: 'google.com' },
  { key: 'facebook_page_url' as keyof SocialLinks, label: 'המלץ בפייסבוק', domain: 'facebook.com' },
  { key: 'facebook_follow_url' as keyof SocialLinks, label: 'עקוב בפייסבוק', domain: 'facebook.com' },
  { key: 'linkedin_url' as keyof SocialLinks, label: 'עקוב בלינקדאין', domain: 'linkedin.com' },
  { key: 'youtube_url' as keyof SocialLinks, label: 'עקוב ביוטיוב', domain: 'youtube.com' },
  { key: 'tiktok_url' as keyof SocialLinks, label: 'עקוב בטיקטוק', domain: 'tiktok.com' },
  { key: 'autotuesday_url' as keyof SocialLinks, label: 'Auto Tuesday', domain: 'autotuesday.com' },
]
