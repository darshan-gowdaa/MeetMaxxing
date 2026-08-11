export interface Provider {
 id: string;
 name: string;
 logo: string;
 docs_url: string;
 pattern: string;
 pricing: string;
}

export interface ApiKey {
 id: string;
 provider_id: string;
 label: string;
 last4: string;
 status:"valid"|"invalid"|"unchecked"|"rate_limited";
 last_checked_at: string;
 is_default_for_provider: boolean;
}
