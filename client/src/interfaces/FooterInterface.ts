export interface FooterLinkItem {
  label: string;
  href: string;
}

export interface FooterSection {
  title: string;
  links: FooterLinkItem[];
}

export interface FooterProps {
  brandName: string;
  description?: string;
  sections?: FooterSection[];
  bottomText?: string;
  className?: string;
}
