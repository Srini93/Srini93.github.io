"""Curated portfolio chunks for RAG (ids + text). Edit and re-run ingest.py after changes."""

KNOWLEDGE_BASE: list[dict[str, str]] = [
    # === BIO & CONTACT (resume: srinivasan.design/Resume_Srinivasan.pdf) ===
    {
        "id": "bio",
        "text": (
            "Srinivasan Chakkarapani (Srini) is a Digital Product Designer and Staff Product Designer "
            "at Intuit, based in the San Francisco Bay Area. He has extensive product design experience. "
            "Previous companies: Google, NortonLifeLock, Zoho, Zeta, Tegus, and Holachef. "
            "Contact: tcsreeni93@gmail.com. Portfolio: srinivasan.design. "
            "LinkedIn: linkedin.com/in/srinivasanchakkarapani"
        ),
    },
    {
        "id": "summary",
        "text": (
            "Srini is a product designer delivering customer-centric solutions at the intersection of "
            "business, design, and technology. He leads end-to-end product initiatives from vision through "
            "execution, driving meaningful impact and scalable outcomes. His work focuses on emerging domains "
            "including Cloud Native, Generative AI, and agentic experiences, translating complex challenges "
            "into intuitive, future-ready products."
        ),
    },
    {
        "id": "skills",
        "text": (
            "Core skills: Prototyping, Interaction Design, User Interface Design, User Research, "
            "Design for Artificial Intelligence, Usability Testing, Design Systems, Information Architecture, "
            "Product Strategy, Competitive Analysis, and A/B Testing. "
            "Also proficient in Agentic AI Development, Design Management, Product Vision and Strategy, "
            "Qualitative and Quantitative User Research, Motion Design, and Front End Engineering."
        ),
    },
    {
        "id": "tools",
        "text": (
            "Design tools: Figma, Magicpath, Sketch. AI prototyping: Lovable, Figma Make, Cursor AI. "
            "Research and analytics: Amplitude, Qualtrics, UserTesting, Perplexity, Claude. "
            "Development: HTML, CSS, JavaScript, SwiftUI. "
            "Srini uses agentic development tools and AI-assisted workflows for rapid prototyping."
        ),
    },
    {
        "id": "languages",
        "text": (
            "Languages: English (Professional Working proficiency), Tamil (Native or Bilingual proficiency)."
        ),
    },
    # === EDUCATION ===
    {
        "id": "education",
        "text": (
            "Education: Master of Science in Human Computer Interaction from DePaul University, Chicago. "
            "Bachelor of Technology in Computer Science & Engineering from SASTRA University, India."
        ),
    },
    {
        "id": "certifications",
        "text": (
            "Certifications: Recognized Mentor (multiple times), Introduction to Generative AI. "
            "Honors & Awards: Runners up - Weave the Web, Runner Up - Web."
        ),
    },
    # === INTUIT ===
    {
        "id": "intuit_overview",
        "text": (
            "At Intuit, Srini works on the Developer Experiences team in Mountain View, CA. "
            "Staff Product Designer (August 2025 - Present): Leading design for end-to-end API Platform, "
            "core development portal, and Agent-driven development lifecycle experiences. Advocates for "
            "agentic development tools and processes, enabling designers to adopt code-first prototyping, "
            "handoffs, and experiments. Senior Product Designer (January 2023 - July 2025)."
        ),
    },
    {
        "id": "intuit_api_platform",
        "text": (
            "Intuit API Platform: Led design for Intuit's API Platform and a suite of Generative AI experiences. "
            "Delivered 0-to-1 experiences across API Explorer, API documentation, authentication, and sandbox "
            "testing tools. Improved API discoverability and developer efficiency across internal developer "
            "teams. Partnered with cross-functional stakeholders and leadership to shape "
            "strategy, roadmap, and engineering solutions."
        ),
    },
    {
        "id": "intuit_assist",
        "text": (
            "Intuit Assist: Srini led design for Intuit Assist, a GenAI-powered developer assistant, delivering "
            "0-to-1 experiences across internal development platforms and IDEs. Led AI-driven design solutions "
            "for summary generation, internal documentation authoring, and API discovery tools. Contributed to "
            "the GenUX framework (Intuit's GenAI Framework), ensuring cohesion with existing systems."
        ),
    },
    {
        "id": "intuit_assist_impact",
        "text": (
            "Intuit Assist impact: Reduced time to access support through AI-assisted workflows. "
            "Accelerated IDS code discovery and integration. Scaled to support developers across Intuit. "
            "Featured in Intuit's Investor Relations as part of AI-led growth narrative."
        ),
    },
    {
        "id": "intuit_design_system",
        "text": (
            "Intuit Design Systems: Represented Developer Experiences in the Intuit Design System (IDS) cadence. "
            "Evolved a component library. Championed Stack Mirroring to align design and engineering, "
            "boosting consistency and delivery speed. Led workshops bridging design and engineering."
        ),
    },
    {
        "id": "intuit_mentorship",
        "text": (
            "At Intuit, Srini partners cross-functionally and mentors teams, shaping strategy, roadmap, and "
            "AI-driven solutions. Coaches designers in Generative AI, data fluency, and design systems. "
            "Active panel member hiring interns, designers, contractors, and design technologists."
        ),
    },
    # === NORTONLIFELOCK ===
    {
        "id": "norton_overview",
        "text": (
            "At NortonLifeLock: Senior Product Designer (May 2022 - December 2022) and Product Designer "
            "(November 2020 - May 2022). Primary Product Designer for the flagship cybersecurity product "
            "Norton 360 on iOS and iPadOS. Full-spectrum product designer working with the core mobile team "
            "to establish best practices, design systems, and frameworks."
        ),
    },
    {
        "id": "norton_spam_features",
        "text": (
            "Norton spam protection: Full Spectrum Designer for spam protection features in Norton 360, "
            "including Secure Calendar and SMS Security. Shipped globally across multiple languages. "
            "Worked with Product Managers, design stakeholders, and UX researchers from ideation to execution."
        ),
    },
    {
        "id": "norton_design_system",
        "text": (
            "Norton Design System: Initiated and built a white-label-friendly design system and frameworks "
            "for Norton 360 on iOS and iPadOS. Collaborated with engineering on component-based modular design. "
            "Established processes for white-label and partner apps. Improved velocity for first-party and "
            "partner products with shared design and engineering language."
        ),
    },
    {
        "id": "norton_process",
        "text": (
            "At Norton, Srini organized workshops for designers and engineers to onboard stakeholders to Figma. "
            "Evangelized best practices in establishing design systems through process-sharing presentations."
        ),
    },
    # === TEGUS ===
    {
        "id": "tegus",
        "text": (
            "At Tegus (August 2020 - October 2020) in Chicago, Illinois as Product Designer. "
            "Contributed to research and insights products used by investment and strategy professionals."
        ),
    },
    # === GOOGLE ===
    {
        "id": "google",
        "text": (
            "At Google (June 2019 - September 2019) in New York as User Experience Design Intern. "
            "Designed and launched the first Design System for Google Ad Manager after the amalgamation "
            "of DoubleClick AdExchange and DoubleClick for Publishers."
        ),
    },
    {
        "id": "google_accomplishments",
        "text": (
            "Google accomplishments: Delivered a library of reusable components for Google Ad Manager's "
            "design system, improving design consistency and reducing interface design time across multiple "
            "product teams. Collaborated with senior interaction designers and developers to audit and "
            "prioritize components. Standardized typography, colors, and component variants with visual design "
            "lead. Published version changelogs and organized education workshops. The pilot design system "
            "helped secure dedicated development support."
        ),
    },
    # === ZETA ===
    {
        "id": "zeta",
        "text": (
            "At Zeta (February 2018 - August 2018) in Bengaluru as Interaction Designer. "
            "Sole designer for stealth-mode products digitizing tax benefits for employers and employees "
            "on web and mobile platforms, from ideation through interaction design. Also improved UX and "
            "visual design for the Leave Travel Allowance program in Zeta Optima."
        ),
    },
    # === ZOHO ===
    {
        "id": "zoho",
        "text": (
            "At Zoho Corporation (December 2015 - January 2018) in Chennai as Product Designer. "
            "Designed and launched the first mobile version of Zoho Sheet for iOS and Android. "
            "Sole product designer owning end-to-end product design and design system creation."
        ),
    },
    {
        "id": "zoho_accomplishments",
        "text": (
            "Zoho Sheet accomplishments: Designed as sole designer across iOS, iPadOS, and Android. "
            "Created a cross-platform design system improving consistency and code efficiency. "
            "Zoho Sheet is widely used across app stores."
        ),
    },
    # === HOLACHEF ===
    {
        "id": "holachef",
        "text": (
            "At Holachef Hospitality Pvt. Ltd. (June 2015 - December 2015) in Mumbai as "
            "Product Designer. Worked on consumer-facing and internal applications across iOS, Android, and Web."
        ),
    },
    {
        "id": "holachef_accomplishments",
        "text": (
            "Holachef accomplishments: Designed primary consumer-facing mobile apps for Android and iOS. "
            "Collaborated with Head of Design on visual standards and guidelines. "
            "Designed applications for chefs and delivery executives. Revamped primary product website."
        ),
    },
    # === PORTFOLIO & PHILOSOPHY ===
    {
        "id": "portfolio",
        "text": (
            "Srini's portfolio site is srinivasan.design featuring case studies for Intuit Assist and "
            "Norton 360. Resume available at srinivasan.design/Resume_Srinivasan.pdf. "
            "Designed and handcoded in San Francisco Bay Area."
        ),
    },
    {
        "id": "philosophy",
        "text": (
            "Design philosophy: clarity over decoration, systems thinking, and partnering tightly with "
            "engineering. Favors evidence from research and usage data to guide product decisions. "
            "Focuses on creating simple and intuitive interfaces for complex domains."
        ),
    },
    {
        "id": "adplist_mentorship",
        "text": (
            "Srini is a mentor on ADPList (adplist.org), where he offers free 1:1 mentorship sessions. "
            "His ADPList profile is https://adplist.org/mentors/srini-chakkarapani. "
            "He mentors on product design, UI/visual design, interaction design, design systems, "
            "Generative AI in product design, developer experience, and career growth for designers. "
            "Visitors can view his availability and request sessions through ADPList after signing in."
        ),
    },
]
