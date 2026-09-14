/*
 * Demo datasets for the new marketplace-ops consoles in
 * ../web ui ux design/. These consoles (3PL, campaigns, commissions, DEX,
 * KYC, Mall approvals, risk, voucher pools) have no Supabase tables yet, so
 * they render these seeded rows — lifted from the designs' own sample data —
 * behind a visible "demo data" badge. Products/orders/customers pages keep
 * live Supabase data.
 */

export interface ThreePlShipment {
  waybill: string;
  partnerWaybill: string;
  carrier: string;
  lane: string;
  stage: string;
  slaHours: number;
  window: string;
  cost: number;
  cod: number;
  telemetry: "Live" | "Stale" | "Offline";
}

export const threePlShipments: ThreePlShipment[] = [
  { waybill: "GLM-88410233", partnerWaybill: "PTO-NP-99231", carrier: "Pathao Courier", lane: "Kathmandu → Butwal", stage: "In Transit", slaHours: 18, window: "11:00–17:00", cost: 95, cod: 4250, telemetry: "Live" },
  { waybill: "GLM-88410467", partnerWaybill: "NCM-EXP-40912", carrier: "Nepcan Transport", lane: "Kathmandu → Biratnagar", stage: "At Hub", slaHours: 32, window: "Next day", cost: 120, cod: 12890, telemetry: "Live" },
  { waybill: "GLM-88410501", partnerWaybill: "DPD-77213", carrier: "DHL Global", lane: "Kathmandu → Nepalgunj", stage: "Out for Delivery", slaHours: 6, window: "09:00–13:00", cost: 85, cod: 0, telemetry: "Stale" },
  { waybill: "GLM-88410612", partnerWaybill: "SAK-NP-1029", carrier: "Sakbar Courier", lane: "Pokhara → Damak", stage: "Delayed", slaHours: 54, window: "14:00–19:00", cost: 140, cod: 7420, telemetry: "Offline" },
  { waybill: "GLM-88410700", partnerWaybill: "PTO-NP-99422", carrier: "Pathao Courier", lane: "Kathmandu → Hetauda", stage: "Delivered", slaHours: 9, window: "Closed", cost: 90, cod: 2199, telemetry: "Live" },
  { waybill: "GLM-88410788", partnerWaybill: "AGI-EXP-5521", carrier: "Agnair Logistics", lane: "Kathmandu → Janakpur", stage: "In Transit", slaHours: 22, window: "10:00–16:00", cost: 110, cod: 5340, telemetry: "Live" },
];

export interface Campaign {
  id: string;
  name: string;
  windowLabel: string;
  status: "Live" | "Scheduled" | "Armed";
  gmvTarget: number;
  gmvActual: number;
  voucherPool: string;
  buyers: number;
  botShield: "On" | "Observing";
}

export const campaigns: Campaign[] = [
  { id: "CMP-9.9", name: "9.9 Mega Sale", windowLabel: "8 Sep (8PM) – 15 Sep", status: "Live", gmvTarget: 42_000_000, gmvActual: 26_418_500, voucherPool: "POOL-99-MEGA", buyers: 12480, botShield: "On" },
  { id: "CMP-11.11", name: "11.11 Singles' Day", windowLabel: "10 Nov (8PM) – 12 Nov", status: "Scheduled", gmvTarget: 68_000_000, gmvActual: 0, voucherPool: "POOL-1111", buyers: 0, botShield: "Observing" },
  { id: "CMP-DASH", name: "Dashain Bonus Drop", windowLabel: "18 Sep – 27 Sep", status: "Armed", gmvTarget: 21_500_000, gmvActual: 0, voucherPool: "POOL-DASH", buyers: 0, botShield: "On" },
  { id: "CMP-XMAS", name: "Winter Clearance", windowLabel: "18 Dec – 24 Dec", status: "Scheduled", gmvTarget: 12_000_000, gmvActual: 0, voucherPool: "POOL-XMAS", buyers: 0, botShield: "Observing" },
];

export interface CampaignSku {
  product: string;
  seller: string;
  price: number;
  campaignPrice: number;
  subsidySplit: string;
  flashStock: number;
  burned: number;
  velocity: number;
}

export const campaignSkus: CampaignSku[] = [
  { product: "Goldstar Shoes Black Classic 42", seller: "Everest Gadgets Nepal", price: 4500, campaignPrice: 2699, subsidySplit: "70/30", flashStock: 400, burned: 231, velocity: 38 },
  { product: "Horlicks Classic Malt Jar 1 kg", seller: "NutriHub Store", price: 1890, campaignPrice: 1549, subsidySplit: "50/50", flashStock: 900, burned: 612, velocity: 74 },
  { product: "Mini Wireless Keyboard + Mouse", seller: "Tech Bazaar", price: 1710, campaignPrice: 1199, subsidySplit: "80/20", flashStock: 250, burned: 180, velocity: 22 },
  { product: "Vartex 24\" Frameless Gaming Monitor", seller: "Pixel Depot", price: 13999, campaignPrice: 11499, subsidySplit: "60/40", flashStock: 60, burned: 41, velocity: 6 },
];

export interface CatalogSku {
  sku: string;
  product: string;
  merchant: string;
  category: string;
  irdTax: string;
  price: number;
  strike: number;
  stock: number;
  reserved: number;
  runRate: number;
  status: "Active" | "Parked" | "Review";
}

export const catalogSkus: CatalogSku[] = [
  { sku: "GLM-ELEC-0001", product: "Vartex 24\" Frameless Gaming Monitor", merchant: "Pixel Depot", category: "Electronics", irdTax: "13% VAT", price: 13999, strike: 16500, stock: 34, reserved: 6, runRate: 4.2, status: "Active" },
  { sku: "GLM-GROC-0142", product: "Horlicks Classic Malt Jar 1 kg", merchant: "ZenFusion Grocer", category: "Groceries", irdTax: "5% VAT", price: 1890, strike: 2150, stock: 212, reserved: 30, runRate: 28, status: "Active" },
  { sku: "GLM-FASH-0417", product: "Summer Balaclava UV Face Mask", merchant: "Kicks & Fits", category: "Fashion", irdTax: "13% VAT", price: 399, strike: 699, stock: 0, reserved: 0, runRate: 9, status: "Review" },
  { sku: "GLM-LIFE-0098", product: "Wireless Portable Bluetooth Speaker", merchant: "SoundNepal", category: "Lifestyle", irdTax: "13% VAT", price: 1050, strike: 1499, stock: 78, reserved: 12, runRate: 11, status: "Active" },
  { sku: "GLM-JWEL-0011", product: "Gold Plated Ankle Collection", merchant: "Gulmeli Gold House", category: "Jewelry", irdTax: "13% + excise", price: 28900, strike: 32000, stock: 9, reserved: 2, runRate: 0.6, status: "Parked" },
];

export const FULFILLMENT_STAGES = [
  "Placed", "Verified", "Packed", "Invoice", "Manifest", "Pickup", "Hub In", "Linehaul",
  "Hub Out", "Rider Assigned", "Out for Delivery", "First Attempt", "Retry Scheduled",
  "Delivered", "COD Collected", "COD Deposited", "Reconciled", "Return Initiated",
  "Return QC", "Refund Queued", "Closed",
] as const;

export interface PipelineOrder {
  id: string;
  placedAt: string;
  customer: string;
  city: string;
  stage: string;
  courier: string;
  tracking: string;
  payment: string;
  total: number;
  risk: "Low" | "Watch" | "High";
}

export const pipelineOrders: PipelineOrder[] = [
  { id: "GLM-ORD-778120", placedAt: "14 Sep 09:12", customer: "Sita Gurung", city: "Kathmandu", stage: "Out for Delivery", courier: "Pathao", tracking: "PTO-99231", payment: "COD", total: 4250, risk: "Low" },
  { id: "GLM-ORD-778144", placedAt: "14 Sep 10:02", customer: "Rabin Shah", city: "Butwal", stage: "Linehaul", courier: "Nepcan", tracking: "NCM-40912", payment: "eSewa", total: 1890, risk: "Low" },
  { id: "GLM-ORD-778155", placedAt: "14 Sep 10:44", customer: "Anita Thapa", city: "Biratnagar", stage: "Packed", courier: "—", tracking: "—", payment: "COD", total: 12890, risk: "Watch" },
  { id: "GLM-ORD-778201", placedAt: "14 Sep 12:30", customer: "Kiran Yadav", city: "Janakpur", stage: "First Attempt", courier: "Sakbar", tracking: "SAK-1029", payment: "COD", total: 7420, risk: "High" },
  { id: "GLM-ORD-778260", placedAt: "14 Sep 14:05", customer: "Pemba Lama", city: "Namche", stage: "Hub In", courier: "Agnair", tracking: "AGI-5521", payment: "Khalti", total: 2210, risk: "Watch" },
  { id: "GLM-ORD-778301", placedAt: "14 Sep 15:51", customer: "Deepa Karki", city: "Pokhara", stage: "Delivered", courier: "DHL", tracking: "DPD-77213", payment: "Card", total: 5340, risk: "Low" },
  { id: "GLM-ORD-778333", placedAt: "14 Sep 16:40", customer: "Bikash Thapa", city: "Hetauda", stage: "COD Collected", courier: "Pathao", tracking: "PTO-99422", payment: "COD", total: 2199, risk: "Low" },
  { id: "GLM-ORD-778358", placedAt: "14 Sep 17:22", customer: "Manisha Rai", city: "Dharan", stage: "Return QC", courier: "Nepcan", tracking: "NCM-41002", payment: "Refund", total: 999, risk: "High" },
];

export interface PayoutBatch {
  batchId: string;
  merchant: string;
  pan: string;
  bank: string;
  account: string;
  gross: number;
  commission: number;
  deductions: number;
  net: number;
  channel: string;
  status: "Disbursed" | "Ready" | "Held";
}

export const payoutBatches: PayoutBatch[] = [
  { batchId: "IPS-WED-38", merchant: "Everest Gadgets Nepal", pan: "52-2214889", bank: "Nabil Bank", account: "0471-***-772", gross: 1_240_500, commission: 148_860, deductions: 16_120, net: 1_075_520, channel: "NCHL-IPS", status: "Ready" },
  { batchId: "IPS-WED-38", merchant: "ZenFusion Grocer", pan: "63-1190442", bank: "Global IME", account: "0201-***-190", gross: 742_000, commission: 89_040, deductions: 0, net: 652_960, channel: "NCHL-IPS", status: "Disbursed" },
  { batchId: "IPS-WED-39", merchant: "Gulmeli Gold House", pan: "30-9981204", bank: "Siddhartha Bank", account: "0091-***-221", gross: 2_318_900, commission: 347_835, deductions: 46_378, net: 1_924_687, channel: "RTGS", status: "Held" },
];

export interface KycApplication {
  id: string;
  merchant: string;
  entity: string;
  category: string;
  registration: string;
  pan: string;
  location: string;
  hub: string;
  riskScore: number;
  maker: "Pending" | "Cleared" | "Rejected";
  checker: "Pending" | "Cleared" | "Blocked";
}

export const kycQueue: KycApplication[] = [
  { id: "KYC-4410", merchant: "Himalayan Handloom", entity: "Private Ltd", category: "Fashion", registration: "U-99211-KTM", pan: "61-887201", location: "Lalitpur", hub: "Lubhu", riskScore: 12, maker: "Cleared", checker: "Pending" },
  { id: "KYC-4411", merchant: "Terai Fresh Mart", entity: "Proprietorship", category: "Groceries", registration: "P-44120-JHR", pan: "39-100228", location: "Birgunj", hub: "Birgunj", riskScore: 34, maker: "Pending", checker: "Pending" },
  { id: "KYC-4412", merchant: "Kathmandu Tech Hub", entity: "Private Ltd", category: "Electronics", registration: "U-10299-KTM", pan: "22-900114", location: "Kathmandu", hub: "Thapathali", riskScore: 78, maker: "Rejected", checker: "Blocked" },
  { id: "KYC-4413", merchant: "Pokhara Organic Co", entity: "Cooperative", category: "Groceries", registration: "C-77120-PKR", pan: "71-441923", location: "Pokhara", hub: "Pokhara", riskScore: 8, maker: "Cleared", checker: "Cleared" },
];

export interface MallApplication {
  id: string;
  brand: string;
  entity: string;
  tier: string;
  category: string;
  doi: string;
  cbms: "Verified" | "Pending" | "Mismatch";
  submitted: string;
  slaHours: number;
  checker: string;
}

export const mallQueue: MallApplication[] = [
  { id: "MAL-0142", brand: "Goldstar Shoes", entity: "Classic Footwear Pvt", tier: "Brand Owner", category: "Fashion", doi: "DOI-8812", cbms: "Verified", submitted: "12 Sep 10:20", slaHours: 6, checker: "Nirmala P." },
  { id: "MAL-0143", brand: "Dabur Nepal", entity: "Dabur IPL", tier: "Authorized Reseller", category: "Groceries", doi: "DOI-1145", cbms: "Pending", submitted: "13 Sep 14:02", slaHours: 22, checker: "—" },
  { id: "MAL-0144", brand: "Vartex Displays", entity: "Vartex Trading", tier: "Distributor", category: "Electronics", doi: "DOI-2290", cbms: "Mismatch", submitted: "14 Sep 09:47", slaHours: 41, checker: "Suman R." },
];

export interface ThreatIncident {
  id: string;
  vector: string;
  target: string;
  ip: string;
  device: string;
  score: number;
  rule: string;
  action: string;
}

export const threatStream: ThreatIncident[] = [
  { id: "INC-90221", vector: "Credential stuffing", target: "/auth/login", ip: "203.78.12.44/24", device: "fp_9ac2…", score: 92, rule: "R-BRUTE-7", action: "OTP challenge" },
  { id: "INC-90222", vector: "Bot checkout swarm", target: "/checkout 9.9 flash", ip: "103.9.220.0/22", device: "headless-x", score: 88, rule: "R-BOT-12", action: "Rate throttle 0/s" },
  { id: "INC-90223", vector: "Coupon farming", target: "/api/voucher", ip: "182.93.44.9", device: "fp_77d1…", score: 61, rule: "R-COUPON-3", action: "Shadow-ban" },
  { id: "INC-90224", vector: "Scraping", target: "/search", ip: "66.249.66.1", device: "Googlebot (verified)", score: 15, rule: "R-BOT-1", action: "Allowed" },
];

export const riskRules = [
  { rule: "R-BOT-12", name: "Headless browser at checkout", enforcement: "Block + device ban", throttle: "0 req/s", updated: "13 Sep" },
  { rule: "R-COUPON-3", name: "Voucher claim burst > 5/min", enforcement: "Shadow-ban", throttle: "1 req/min", updated: "11 Sep" },
  { rule: "R-BRUTE-7", name: "Login failures from /24", enforcement: "OTP challenge", throttle: "—", updated: "09 Sep" },
];

export interface VoucherPool {
  code: string;
  title: string;
  mechanics: string;
  cap: string;
  quota: number;
  burned: number;
  burnPct: number;
  funding: string;
  flags: string;
  status: "Active" | "Throttled" | "Frozen";
}

export const voucherPools: VoucherPool[] = [
  { code: "GULMELI10", title: "10% off Rs. 500+", mechanics: "Percent off, min basket", cap: "1 / account", quota: 5000, burned: 3210, burnPct: 64, funding: "Store", flags: "—", status: "Active" },
  { code: "FREESHIP99", title: "Free delivery 9.9 week", mechanics: "Flat Rs. 100 waiver", cap: "2 / account", quota: 10000, burned: 2110, burnPct: 21, funding: "60/40 store + Pathao", flags: "—", status: "Active" },
  { code: "GEMCHEST", title: "Gems-to-NPR burn", mechanics: "100 gems = Rs. 5", cap: "Rs. 50 / day", quota: 80000, burned: 41225, burnPct: 52, funding: "Loyalty budget", flags: "Velocity spike (Dashain)", status: "Throttled" },
  { code: "WINTER-X", title: "Winter clearance extra", mechanics: "Rs. 200 off Rs. 2000", cap: "1 / device", quota: 3000, burned: 0, burnPct: 0, funding: "Seller-subsidised", flags: "Unreleased", status: "Frozen" },
];

export const dexHubs = [
  { hub: "Kathmandu Central Sortation", code: "KTM-01", province: "Bagmati", inbound: 2310, outbound: 2180, fleet: "18 vans · 6 trucks", sla: "98.4%", status: "Normal" },
  { hub: "Pokhara Regional Hub", code: "PKR-02", province: "Gandaki", inbound: 540, outbound: 512, fleet: "6 vans · 2 trucks", sla: "97.1%", status: "Normal" },
  { hub: "Birgunj Border Gate", code: "BJG-01", province: "Madhesh", inbound: 880, outbound: 760, fleet: "8 trucks", sla: "93.8%", status: "Overflow 3PL" },
  { hub: "Bhairahawa West Gate", code: "BHW-01", province: "Lumbini", inbound: 410, outbound: 395, fleet: "4 vans", sla: "96.2%", status: "Normal" },
  { hub: "Nepalgunj Mid-West", code: "NPJ-01", province: "Karnali", inbound: 180, outbound: 171, fleet: "2 vans", sla: "90.2%", status: "Weather delay" },
  { hub: "Itahari East Hub", code: "ITH-01", province: "Koshi", inbound: 320, outbound: 300, fleet: "5 vans", sla: "95.7%", status: "Normal" },
];

export const opsKpis = [
  { label: "GMV today (NPR)", value: "Rs. 26.4M", delta: "+12.4% vs 9.9 pre-day", tone: "up" },
  { label: "Active Merchants", value: "1,284", delta: "+18 this week", tone: "up" },
  { label: "Open Orders", value: "3,201", delta: "-6.2% backlog", tone: "down" },
  { label: "COD Pending (NPR)", value: "Rs. 18.9M", delta: "+Rs. 1.2M", tone: "warn" },
  { label: "Flash Stock Burn", value: "57%", delta: "healthy", tone: "up" },
  { label: "Threat Blocks / hr", value: "412", delta: "bot swarm easing", tone: "warn" },
];
