import { prisma } from "@/web/lib/prisma";

export async function JsonLd() {
  let siteName = "Saints Gaming";
  let metaDescription = "Saints Gaming - Game Servers, Mod Packs, Community, and Embedded MMO Experience.";
  let googleVerification: string | null = null;
  let bingVerification: string | null = null;
  let customFaqJson: string | null = null;

  try {
    const settings = await prisma.siteSetting.findMany({
      where: {
        key: {
          in: [
            "SITE_NAME",
            "META_DESCRIPTION",
            "SEO_CANONICAL_URL",
            "SEO_GOOGLE_VERIFICATION",
            "SEO_BING_VERIFICATION",
            "SEO_FAQ_DATA",
          ],
        },
      },
    });

    const configMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    if (configMap["SITE_NAME"]) siteName = configMap["SITE_NAME"];
    if (configMap["META_DESCRIPTION"]) metaDescription = configMap["META_DESCRIPTION"];
    if (configMap["SEO_GOOGLE_VERIFICATION"]) googleVerification = configMap["SEO_GOOGLE_VERIFICATION"].trim();
    if (configMap["SEO_BING_VERIFICATION"]) bingVerification = configMap["SEO_BING_VERIFICATION"].trim();
    if (configMap["SEO_FAQ_DATA"]) customFaqJson = configMap["SEO_FAQ_DATA"];
  } catch (err) {
    // Database fallback
  }

  const baseUrl =
    process.env.SERAPHT_PUBLIC_SITE_URL ||
    process.env.SERAPHT_PUBLIC_APP_URL ||
    "https://www.saintsgaming.net";

  const cleanBaseUrl = baseUrl.replace(/\/$/, "");

  const structuredData: any[] = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${cleanBaseUrl}/#website`,
      "name": siteName,
      "url": cleanBaseUrl,
      "description": metaDescription,
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${cleanBaseUrl}/forum/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${cleanBaseUrl}/#organization`,
      "name": siteName,
      "url": cleanBaseUrl,
      "logo": `${cleanBaseUrl}/logo.png`,
      "foundingDate": "2007",
      "sameAs": [
        "https://discord.saintsgaming.net",
        "https://twitter.com/SaintsGamingNet",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": `${cleanBaseUrl}/#navigation`,
      "name": `${siteName} Main Navigation`,
      "itemListElement": [
        {
          "@type": "SiteNavigationElement",
          "position": 1,
          "name": "Forums",
          "description": "Community discussion boards, announcements, guides, and player support.",
          "url": `${cleanBaseUrl}/forum`,
        },
        {
          "@type": "SiteNavigationElement",
          "position": 2,
          "name": "News",
          "description": "Latest announcements, patch updates, development logs, and events.",
          "url": `${cleanBaseUrl}/news`,
        },
        {
          "@type": "SiteNavigationElement",
          "position": 3,
          "name": "Live Streams",
          "description": "Watch live gameplay and streams from Saints Gaming community creators.",
          "url": `${cleanBaseUrl}/streams`,
        },
        {
          "@type": "SiteNavigationElement",
          "position": 4,
          "name": "Modpacks",
          "description": "Download official custom modpacks, launchers, and client graphics enhancements.",
          "url": `${cleanBaseUrl}/modpacks`,
        },
        {
          "@type": "SiteNavigationElement",
          "position": 5,
          "name": "The Lobby",
          "description": "Enter our embedded 2.5D multiplayer social game world and explore realms.",
          "url": `${cleanBaseUrl}/lobby`,
        },
      ],
    },
  ];

  if (customFaqJson) {
    try {
      const faqs = JSON.parse(customFaqJson);
      if (Array.isArray(faqs) && faqs.length > 0) {
        structuredData.push({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "@id": `${cleanBaseUrl}/#faq`,
          "mainEntity": faqs.map((f: { question: string; answer: string }) => ({
            "@type": "Question",
            "name": f.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": f.answer,
            },
          })),
        });
      }
    } catch {
      // Ignore invalid FAQ JSON
    }
  }

  return (
    <>
      {googleVerification && (
        <meta name="google-site-verification" content={googleVerification} />
      )}
      {bingVerification && (
        <meta name="msvalidate.01" content={bingVerification} />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </>
  );
}
