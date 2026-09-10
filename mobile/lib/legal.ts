// Legal copy for the Terms of Service and Privacy Policy screens.
//
// Kept as structured data (not JSX) so both the in-app screens and any future
// web/PDF rendering share one source of truth. Wording is Zimbabwe-specific:
// ZIMRA tax obligations, the Data Protection Act [Chapter 10:06], and
// Zimbabwean governing law.

export type LegalSection = {
  heading: string;
  /** Paragraphs rendered in order. */
  body: string[];
  /** Optional bullet list rendered after the paragraphs. */
  bullets?: string[];
};

export type LegalDocument = {
  slug: "terms" | "privacy";
  title: string;
  /** Shown under the title, e.g. "Last updated 1 January 2026". */
  updated: string;
  /** One-line plain-language summary shown in a callout at the top. */
  summary: string;
  sections: LegalSection[];
};

export const LEGAL_ENTITY = {
  product: "LogicTag Properties",
  company: "LogicTag Properties (Private) Limited",
  email: "properties@logictag.co.zw",
  supportEmail: "properties@logictag.co.zw",
  address: "Harare, Zimbabwe",
  jurisdiction: "the Republic of Zimbabwe",
} as const;

export const TERMS: LegalDocument = {
  slug: "terms",
  title: "Terms of Service",
  updated: "Last updated 1 January 2026",
  summary:
    "These terms govern your use of LogicTag Properties. By creating an account you accept them.",
  sections: [
    {
      heading: "1. About these terms",
      body: [
        `These Terms of Service ("Terms") form a binding agreement between you and ${LEGAL_ENTITY.company} ("we", "us") governing your access to and use of the ${LEGAL_ENTITY.product} application and related services (the "Service").`,
        `By registering for an account, signing in, or otherwise using the Service you confirm that you have read, understood and agreed to be bound by these Terms. If you do not agree, you must not use the Service.`,
      ],
    },
    {
      heading: "2. Who may use the Service",
      body: [
        "You must be at least 18 years old and legally capable of entering into a binding contract to use the Service.",
        "Where you use the Service on behalf of a company, trust, partnership or other organisation, you confirm that you are authorised to bind that organisation to these Terms.",
      ],
    },
    {
      heading: "3. Your account",
      body: [
        "You are responsible for the accuracy of the information you provide and for keeping your login credentials confidential. You must notify us immediately if you suspect unauthorised access to your account.",
        "We may suspend or terminate an account that is used unlawfully, that infringes the rights of others, or that is used to submit false or misleading records.",
      ],
    },
    {
      heading: "4. Acceptable use",
      body: ["You agree not to:"],
      bullets: [
        "use the Service for any unlawful purpose or in breach of any Zimbabwean law or regulation;",
        "upload content that is defamatory, fraudulent, or that infringes any third party's intellectual property or privacy rights;",
        "attempt to gain unauthorised access to the Service, other accounts, or the systems that host it;",
        "interfere with, reverse engineer, or disrupt the normal operation of the Service;",
        "use the Service to submit tax, accounting or compliance records that you know to be false or misleading.",
      ],
    },
    {
      heading: "5. Property, tenancy and tax records",
      body: [
        "The Service helps you record property, tenancy, rent, expense and tax information. You remain solely responsible for the accuracy and completeness of the records you enter, and for the returns, declarations and payments you file with the Zimbabwe Revenue Authority (ZIMRA) or any other authority.",
        "Tax rates, thresholds and calculation rules shown in the Service are provided for convenience and are drawn from published Zimbabwean legislation and ZIMRA public notices. They may change, and they do not constitute tax advice. You should confirm the current position with ZIMRA or a registered tax practitioner before relying on any figure.",
        "Where the Service generates a tax return or compliance report, that document is a working draft prepared from the data you have entered. It is not a filing, and it does not discharge any statutory obligation until it is reviewed, approved and submitted through the correct ZIMRA channel.",
      ],
    },
    {
      heading: "6. Fees and subscriptions",
      body: [
        "Some features of the Service are provided on a paid subscription basis. Subscription fees, billing intervals and any per-unit charges are shown in the app before you subscribe.",
        "Subscriptions renew automatically at the end of each billing period unless cancelled before the renewal date. Fees already paid are non-refundable except where required by law.",
      ],
    },
    {
      heading: "7. Intellectual property",
      body: [
        `The Service, including its software, design, text and trade marks, is owned by ${LEGAL_ENTITY.company} or its licensors and is protected by copyright and other laws.`,
        "You retain ownership of the data you enter. You grant us a limited licence to store, process and display that data solely to operate and improve the Service.",
      ],
    },
    {
      heading: "8. Availability and changes",
      body: [
        "We aim to keep the Service available but we do not guarantee uninterrupted or error-free operation. We may modify, suspend or discontinue any part of the Service.",
        "We may update these Terms from time to time. Material changes will be notified in the app or by email, and continued use after the effective date constitutes acceptance.",
      ],
    },
    {
      heading: "9. Limitation of liability",
      body: [
        "To the maximum extent permitted by law, we are not liable for any indirect, incidental or consequential loss, or for any loss of profit, revenue, data or goodwill, arising out of your use of the Service.",
        "Nothing in these Terms excludes or limits liability that cannot lawfully be excluded, including liability under the Consumer Protection Act [Chapter 14:14] where it applies.",
      ],
    },
    {
      heading: "10. Termination",
      body: [
        "You may stop using the Service and close your account at any time. We may suspend or terminate your access if you breach these Terms.",
        "On termination your right to use the Service ends. We may retain records where we are required to do so by law, including tax and accounting record-keeping obligations.",
      ],
    },
    {
      heading: "11. Governing law",
      body: [
        `These Terms are governed by the laws of ${LEGAL_ENTITY.jurisdiction}. The courts of Zimbabwe have exclusive jurisdiction over any dispute arising out of or in connection with them.`,
      ],
    },
    {
      heading: "12. Contact",
      body: [
        `Questions about these Terms can be sent to ${LEGAL_ENTITY.email}.`,
      ],
    },
  ],
};

export const PRIVACY: LegalDocument = {
  slug: "privacy",
  title: "Privacy Policy",
  updated: "Last updated 1 January 2026",
  summary:
    "How we collect, use, share and protect your personal information under Zimbabwe's Data Protection Act.",
  sections: [
    {
      heading: "1. Who we are",
      body: [
        `${LEGAL_ENTITY.company} ("we", "us") operates the ${LEGAL_ENTITY.product} application. We are the data controller responsible for the personal information described in this policy.`,
        `Our registered address is ${LEGAL_ENTITY.address}. Privacy questions can be sent to ${LEGAL_ENTITY.email}.`,
      ],
    },
    {
      heading: "2. The law we follow",
      body: [
        "We process personal information in accordance with the Data Protection Act [Chapter 10:06] of Zimbabwe and, where it applies to you, the General Data Protection Regulation (GDPR) of the European Union.",
        "This means we only process personal information where we have a lawful basis to do so, we limit collection to what is necessary, and we apply appropriate security safeguards.",
      ],
    },
    {
      heading: "3. Information we collect",
      body: ["Depending on how you use the Service, we may collect:"],
      bullets: [
        "Account details — your name, email address, phone number, role and password (stored only as a salted hash).",
        "Property and tenancy records — property addresses, unit details, lease terms, rent charges and payment records.",
        "Identity and compliance records — where you record tenant identification, ZIMRA taxpayer numbers (TIN), VAT numbers, ITF263 references and supporting documents.",
        "Financial records — rent charges, expenses, invoices, payment references and proof-of-payment uploads.",
        "Technical data — device type, app version, IP address, and diagnostic logs generated when you use the Service.",
      ],
    },
    {
      heading: "4. How we use your information",
      body: ["We use personal information to:"],
      bullets: [
        "create and administer your account and authenticate you;",
        "operate the property, tenancy, billing and maintenance features you use;",
        "calculate tax obligations and generate draft tax returns and compliance reports;",
        "send service notifications, security alerts and support responses;",
        "detect, investigate and prevent fraud, abuse and security incidents;",
        "comply with our legal, tax and accounting obligations.",
      ],
    },
    {
      heading: "5. Lawful bases",
      body: [
        "We rely on performance of our contract with you to provide the Service, on our legitimate interests to secure and improve it, on your consent where you upload optional documents, and on legal obligation where we must keep tax or accounting records.",
      ],
    },
    {
      heading: "6. Sharing your information",
      body: [
        "We do not sell your personal information. We share it only with:",
      ],
      bullets: [
        "service providers who host, store or support the Service on our behalf, under written confidentiality obligations;",
        "payment providers, where you make or receive a payment through the Service;",
        "professional advisers such as auditors, accountants or lawyers, where necessary;",
        "regulators, courts or law enforcement, where we are legally required to disclose — including the Zimbabwe Revenue Authority where a lawful request is made.",
      ],
    },
    {
      heading: "7. Cross-border transfers",
      body: [
        "Some of our service providers store data outside Zimbabwe. Where personal information is transferred across borders we require the recipient to apply protections at least equivalent to those in the Data Protection Act [Chapter 10:06].",
      ],
    },
    {
      heading: "8. How long we keep it",
      body: [
        "We keep account data for as long as your account is active. Financial, tax and compliance records are retained for the periods required by Zimbabwean tax and company law, after which they are deleted or anonymised.",
      ],
    },
    {
      heading: "9. Security",
      body: [
        "We use encryption in transit, hashed passwords, role-based access control and audit logging to protect personal information. No system is completely secure, and you should keep your credentials confidential.",
      ],
    },
    {
      heading: "10. Your rights",
      body: [
        "Subject to the Data Protection Act [Chapter 10:06], you have the right to:",
      ],
      bullets: [
        "be informed about how your personal information is used;",
        "access the personal information we hold about you;",
        "request correction of inaccurate or incomplete information;",
        "request deletion of information we no longer need;",
        "object to or restrict certain processing;",
        "lodge a complaint with the Data Protection Authority of Zimbabwe.",
      ],
    },
    {
      heading: "11. Children",
      body: [
        "The Service is not intended for anyone under 18, and we do not knowingly collect personal information from children.",
      ],
    },
    {
      heading: "12. Changes to this policy",
      body: [
        "We may update this policy to reflect changes in our practices or the law. Material changes will be notified in the app or by email before they take effect.",
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS: Record<LegalDocument["slug"], LegalDocument> = {
  terms: TERMS,
  privacy: PRIVACY,
};
