import {
  SITE_NAME,
  SITE_URL,
  SITE_DESCRIPTION,
  SITE_SOCIALS,
  absoluteUrl,
} from "./site";

const ORG_ID = `${SITE_URL}/#organization`;
const SITE_ID = `${SITE_URL}/#website`;

export function organizationSchema() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/opengraph-image"),
    },
    ...(SITE_SOCIALS.length ? { sameAs: SITE_SOCIALS } : {}),
  };
}

export function websiteSchema() {
  return {
    "@type": "WebSite",
    "@id": SITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    publisher: { "@id": ORG_ID },
  };
}

export function softwareApplicationSchema() {
  return {
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web browser",
    inLanguage: "en",
    // Free to start — an Offer satisfies the SoftwareApplication rich-result
    // requirement without fabricating ratings/reviews.
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "AI lesson plan generator",
      "AI test and quiz generator",
      "Answer keys and mark allocation",
      "Curriculum-aligned content",
      "Export to PDF",
    ],
    publisher: { "@id": ORG_ID },
  };
}

// Site-wide graph, injected in the root layout.
export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationSchema(), websiteSchema()],
  };
}

// Home-page graph describing the app itself.
export function homeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [softwareApplicationSchema()],
  };
}
