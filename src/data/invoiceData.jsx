export const initialInvoices = [
  {
    id: "INV-001",
    invoiceNo: "2026-OMS6001",
    date: "2026-06-05",
    dueDate: "2026-07-05",
    status: "Unpaid",
    buyerName: "Veda Sastra Gurukul",
    buyerAddress: "718 & 719, 1st Main Road, MG City, Kundrathur, Chennai – 600069",
    buyerMobile: "7904153679",
    buyerGSTIN: "",
    items: [
      {
        sl: 1,
        description: "Website Design, Development and Deployment Services for Veda Sastra Gurukul, including One-Year .in Domain Registration and Initial Website Setup",
        qty: 1,
        rate: 6000,
        amount: 6000,
      },
    ],
    amountPaid: 0,
    notes: "",
  },
  {
    id: "INV-002",
    invoiceNo: "2026-OMS6002",
    date: "2026-06-10",
    dueDate: "2026-07-10",
    status: "Paid",
    buyerName: "ABC Builders",
    buyerAddress: "45, Anna Nagar, Chennai – 600040",
    buyerMobile: "9123456789",
    buyerGSTIN: "33AABCA1234B1ZX",
    items: [
      { sl: 1, description: "Architecture Planning and Design", qty: 1, rate: 20000, amount: 20000 },
      { sl: 2, description: "Interior Design Consultation", qty: 1, rate: 15000, amount: 15000 },
    ],
    amountPaid: 41300,
    notes: "Payment received via bank transfer.",
  },
];

export const companyInfo = {
  name: "ORANGE MEGA SOFTWARE PVT LTD",
  address: "Ground Floor, Clover Plaza, Market Rd,\nMarthandam, Tamil Nadu - 629165",
  gstin: "33AADCO6803H1ZN",
  logo: null,
};