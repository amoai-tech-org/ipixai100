// The 5 canonical V2 iPix service pages — single source for the header
// dropdown + footer links. Clothing/Location/Jewellery/Video are merged or
// dropped from primary nav per IPI-1077 (redirects owned by SEO-001).
export const SERVICES = [
  { label: "Fashion Photography", href: "/services/fashion-photography" },
  { label: "E-commerce Photography", href: "/services/ecommerce-photography" },
  { label: "Amazon Photography", href: "/services/amazon" },
  { label: "Shopify Photography", href: "/services/shopify" },
  { label: "Instagram Campaigns", href: "/services/instagram" },
] as const;