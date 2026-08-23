export function JsonLd() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.saintsgaming.net";

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${baseUrl}/#website`,
      "name": "Saints Gaming",
      "url": baseUrl,
      "description": "Saints Gaming - Game Servers, Mod Packs, Community, and Embedded MMO Experience.",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${baseUrl}/forum/search?q={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${baseUrl}/#organization`,
      "name": "Saints Gaming",
      "url": baseUrl,
      "logo": `${baseUrl}/logo.png`,
      "sameAs": [
        "https://discord.saintsgaming.net"
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": `${baseUrl}/#navigation`,
      "name": "Saints Gaming Main Navigation",
      "itemListElement": [
        {
          "@type": "SiteNavigationElement",
          "position": 1,
          "name": "Forums",
          "description": "Community discussion boards, announcements, guides, and player support.",
          "url": `${baseUrl}/forum`
        },
        {
          "@type": "SiteNavigationElement",
          "position": 2,
          "name": "News",
          "description": "Latest announcements, patch updates, development logs, and events.",
          "url": `${baseUrl}/news`
        },
        {
          "@type": "SiteNavigationElement",
          "position": 3,
          "name": "Live Streams",
          "description": "Watch live gameplay and streams from Saints Gaming community creators.",
          "url": `${baseUrl}/streams`
        },
        {
          "@type": "SiteNavigationElement",
          "position": 4,
          "name": "Modpacks",
          "description": "Download official custom modpacks, launchers, and client graphics enhancements.",
          "url": `${baseUrl}/modpacks`
        },
        {
          "@type": "SiteNavigationElement",
          "position": 5,
          "name": "The Lobby",
          "description": "Enter our embedded 2.5D multiplayer social game world and explore realms.",
          "url": `${baseUrl}/lobby`
        }
      ]
    }
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
