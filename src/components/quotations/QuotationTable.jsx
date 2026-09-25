import {
  FaCode,
  FaPaintBrush,
  FaBullhorn,
  FaStore,
  FaMobile,
  FaServer
} from "react-icons/fa";

// ── Project-Based templates ────────────────────────────────────────────
// Used for service/project quotations (Scope of Work, Deliverables,
// Timeline, Project Cost as free-text lines). Reuses the 6 layout
// components already built (Classic/Creative/Bold/Modern/Minimal/Corporate),
// just renamed here to match the names shown on the Template Page.
export const projectTemplates = [
  { id: "proj-classic", title: "Classic Formal", subtitle: "Traditional & Professional", icon: <FaCode size={20} />, color: "#b08d3e", bg: "linear-gradient(135deg,#b08d3e,#8a6d2e)", timeline: "7–10 working days", amount: 3000, tech: "Next.js", templateStyle: "classic", quotationType: "project" },
  { id: "proj-creative", title: "Creative", subtitle: "Warm & Friendly", icon: <FaPaintBrush size={20} />, color: "#ff6f59", bg: "linear-gradient(135deg,#ff6f59,#e5573f)", timeline: "10–14 working days", amount: 8000, tech: "Figma", templateStyle: "creative", quotationType: "project" },
  { id: "proj-elegant", title: "Elegant", subtitle: "Bold Editorial", icon: <FaBullhorn size={20} />, color: "#d7263d", bg: "linear-gradient(135deg,#d7263d,#a91b2e)", timeline: "3 months", amount: 15000, tech: "Google Ads, Meta", templateStyle: "bold", quotationType: "project" },
  { id: "proj-modern", title: "Modern Professional", subtitle: "Clean & Contemporary", icon: <FaStore size={20} />, color: "#5a8a7f", bg: "linear-gradient(135deg,#5a8a7f,#4a7469)", timeline: "14–20 working days", amount: 25000, tech: "Next.js + Stripe", templateStyle: "modern", quotationType: "project" },
  { id: "proj-minimal", title: "Minimal", subtitle: "Simple & Understated", icon: <FaMobile size={20} />, color: "#111111", bg: "linear-gradient(135deg,#333333,#111111)", timeline: "30–45 working days", amount: 60000, tech: "React Native", templateStyle: "minimal", quotationType: "project" },
  { id: "proj-corporate", title: "Corporate", subtitle: "Structured & Formal", icon: <FaServer size={20} />, color: "#2f5fa8", bg: "linear-gradient(135deg,#2f5fa8,#1e3f75)", timeline: "10–15 working days", amount: 18000, tech: "Node.js + MongoDB", templateStyle: "corporate", quotationType: "project" },
];

// ── Product-Based templates ────────────────────────────────────────────
// Used for product/item quotations (line-item table: qty, unit price,
// discount, tax, amount → subtotal → grand total). templateStyle values
// are prefixed "product-" so they map to their own layout components,
// entirely separate from the project layouts above.
export const productTemplates = [
  { id: "prod-classic", title: "Classic Formal", subtitle: "Traditional Item List", icon: <FaCode size={20} />, color: "#b08d3e", bg: "linear-gradient(135deg,#b08d3e,#8a6d2e)", templateStyle: "product-classic", quotationType: "product" },
  { id: "prod-modern", title: "Modern Professional", subtitle: "Clean Item Table", icon: <FaStore size={20} />, color: "#5a8a7f", bg: "linear-gradient(135deg,#5a8a7f,#4a7469)", templateStyle: "product-modern", quotationType: "product" },
  { id: "prod-minimal", title: "Minimal", subtitle: "Simple Item List", icon: <FaMobile size={20} />, color: "#111111", bg: "linear-gradient(135deg,#333333,#111111)", templateStyle: "product-minimal", quotationType: "product" },
  { id: "prod-elegant", title: "Elegant", subtitle: "Bold Item Table", icon: <FaBullhorn size={20} />, color: "#d7263d", bg: "linear-gradient(135deg,#d7263d,#a91b2e)", templateStyle: "product-elegant", quotationType: "product" },
  { id: "prod-corporate", title: "Corporate", subtitle: "Structured Item Table", icon: <FaServer size={20} />, color: "#2f5fa8", bg: "linear-gradient(135deg,#2f5fa8,#1e3f75)", templateStyle: "product-corporate", quotationType: "product" },
  { id: "prod-creative", title: "Creative", subtitle: "Warm Item Table", icon: <FaPaintBrush size={20} />, color: "#ff6f59", bg: "linear-gradient(135deg,#ff6f59,#e5573f)", templateStyle: "product-creative", quotationType: "product" },
];

// Kept for anywhere in the app that still imports the old flat `templates`
// export — resolves to the Project-Based list so nothing breaks.
export const templates = projectTemplates;

export const initialQuotations = [
  {
    id: "QT-001", name: "John Doe", company: "Doe Enterprises",
    email: "john@doe.com", phone: "9876543210",
    date: "2026-06-01", validUntil: "2026-06-30",
    status: "Pending", amount: 27140, timeline: "7–14 working days",
    description: "",
    scopeOfWork: "Responsive Website Design\n5 Website Pages\nContact Form Integration\nMobile Optimization\nBasic SEO Setup",
    deliverables: "Fully responsive website\nSource code delivery\nAdmin panel access\nDocumentation\n30 days support",
    technologyUsed: "React.js\nNode.js\nMongoDB\nBootstrap",
    timelineDesc: "Completed within 7–14 working days after project confirmation\nRegular progress updates shared with client",
    projectCost: "Web Development: ₹15,000\nUI/UX Design: ₹8,000\nSEO Setup: ₹4,140\nTotal Cost: ₹27,140",
    paymentTerms: "50% advance payment before project commencement\nRemaining 50% before final delivery",
    terms: "Quotation is valid for 30 days\nAdditional revisions beyond agreed scope will be charged separately",
    items: [
      { description: "Web Development", qty: 1, rate: 15000, total: 15000 },
      { description: "UI/UX Design", qty: 2, rate: 4000, total: 8000 },
      { description: "SEO Setup", qty: 1, rate: 4140, total: 4140 },
    ],
    notes: "Payment due within 30 days.", isTemplate: false,
  },
  {
    id: "QT-002", name: "ABC Builders", company: "ABC Construction Pvt Ltd",
    email: "info@abcbuilders.com", phone: "9123456789",
    date: "2026-06-05", validUntil: "2026-07-05",
    status: "Approved", amount: 45000, timeline: "14–20 working days",
    description: "",
    scopeOfWork: "Architecture planning and design\nInterior design concepts\n3D visualization and rendering\nRevision cycles included",
    deliverables: "Architectural drawings\nInterior design concepts\n3D rendered models\nFinal design files",
    technologyUsed: "AutoCAD\nSketchUp\n3ds Max\nV-Ray",
    timelineDesc: "Completed within 14–20 working days\nDepends on feedback and revision cycles",
    projectCost: "Architecture Planning: ₹20,000\nInterior Design: ₹15,000\n3D Rendering: ₹10,000\nTotal Cost: ₹45,000",
    paymentTerms: "50% advance payment required to start work\nRemaining 50% after final approval",
    terms: "Quotation is valid for 30 days\nExtra revisions or design changes will incur additional charges",
    items: [
      { description: "Architecture Planning", qty: 1, rate: 20000, total: 20000 },
      { description: "Interior Design", qty: 1, rate: 15000, total: 15000 },
      { description: "3D Rendering", qty: 2, rate: 5000, total: 10000 },
    ],
    notes: "50% advance required.", isTemplate: false,
  },
  {
    id: "QT-003", name: "XYZ Company", company: "XYZ Technologies",
    email: "contact@xyz.com", phone: "9012345678",
    date: "2026-06-10", validUntil: "2026-07-10",
    status: "Draft", amount: 12500, timeline: "7–10 working days",
    description: "",
    scopeOfWork: "Logo design and brand identity\nBrand kit creation\nBusiness card designs\nEditable source files",
    deliverables: "Logo files in multiple formats\nBrand guideline document\nBusiness card designs\nEditable source files",
    technologyUsed: "Adobe Illustrator\nPhotoshop\nFigma",
    timelineDesc: "Delivery within 7–10 working days including revision cycles",
    projectCost: "Logo Design: ₹5,000\nBrand Kit: ₹4,500\nBusiness Card Design: ₹3,000\nTotal Cost: ₹12,500",
    paymentTerms: "70% advance before starting\nRemaining 30% before final delivery",
    terms: "Quotation valid for 30 days\nExtra revisions beyond 3 rounds will be charged separately",
    items: [
      { description: "Logo Design", qty: 1, rate: 5000, total: 5000 },
      { description: "Brand Kit", qty: 1, rate: 4500, total: 4500 },
      { description: "Business Card Design", qty: 3, rate: 1000, total: 3000 },
    ],
    notes: "3 revision rounds included.", isTemplate: false,
  },
];




export default function QuotationTable({ quotations }) {
  return (
    <div>
      {quotations.map((q) => (
        <p key={q.id}>{q.name}</p>
      ))}
    </div>
  );
}