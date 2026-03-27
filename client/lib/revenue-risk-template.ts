export type RiskCode = {
  code: string;
  name: string;
  description: string;
  typicalSectors: string;
  riskImplication: string;
};

export type DurationCode = {
  code: string;
  name: string;
  description: string;
  riskImplication: string;
};

export const PRICING_MECHANISMS: RiskCode[] = [
  {
    code: "P1",
    name: "Fixed by contract",
    description: "The price per unit (or total payment) is specified in a long-term contract. No exposure to market price movements during the contract term.",
    typicalSectors: "Availability-based PFI/PPP; fixed-price PPA; long-lease real estate; take-or-pay pipeline tariffs.",
    riskImplication: "Lowest pricing risk. Key risk shifts to counterparty credit and contract enforceability.",
  },
  {
    code: "P2",
    name: "Indexed / escalating by formula",
    description: "The price adjusts by a defined formula linked to a published index (CPI, RPI, wage index). The adjustment is mechanical and not subject to negotiation or regulatory discretion.",
    typicalSectors: "Index-linked PFI unitary charges; RPI-linked regulated tariffs; CPI-escalated lease rentals; index-linked PPA prices.",
    riskImplication: "Low pricing risk. Exposed to basis risk between revenue index and cost index, and to index reform risk (e.g. RPI to CPIH transition).",
  },
  {
    code: "P3",
    name: "Regulated / administered",
    description: "The price is set by a regulator or government authority through a periodic review process. The regulatory framework creates both a floor and a ceiling on returns.",
    typicalSectors: "RAB-based utility tariffs; regulated airport charges; regulated pipeline tariffs; water tariffs.",
    riskImplication: "Moderate pricing risk. Regulatory risk is the key concern — adverse determinations can compress margins, but the framework also provides downside protection.",
  },
  {
    code: "P4",
    name: "Negotiated / re-contracted periodically",
    description: "The price is set by commercial negotiation at intervals. At each renewal point there is genuine uncertainty about the outcome.",
    typicalSectors: "Lease renewals; PPA renewals; O&M contract renewals; franchise rebids; airport airline agreements.",
    riskImplication: "Moderate to high pricing risk at renewal points. Depends on contract expiry timing vs debt maturity, market conditions, and borrower competitive position.",
  },
  {
    code: "P5",
    name: "Market / merchant",
    description: "The price is determined by supply and demand in a competitive market at the time of sale. The borrower is a price-taker with no contractual protection.",
    typicalSectors: "Wholesale electricity (merchant generators); commodity prices; hotel room rates; self-storage rates.",
    riskImplication: "Highest pricing risk. Assessment focuses on cost curve position, competitive dynamics, hedging programme, and breakeven price vs forward curve.",
  },
  {
    code: "P6",
    name: "Hybrid / layered",
    description: "A combination of pricing mechanisms where different revenue streams follow different pricing types. Common in practice — most assets have a blended pricing profile.",
    typicalSectors: "Capacity market (P1) + energy market (P5) for power generators; regulated aeronautical charges (P3) + commercial revenue (P5) for airports.",
    riskImplication: "Risk depends on the blend. Assessment must decompose revenue into component streams and classify each separately.",
  },
];

export const VOLUME_MECHANISMS: RiskCode[] = [
  {
    code: "V1",
    name: "Guaranteed / take-or-pay",
    description: "The counterparty must pay regardless of whether they use the capacity or take the product. Volume risk is entirely transferred to the counterparty.",
    typicalSectors: "Take-or-pay gas contracts; ship-or-pay pipeline commitments; availability-based PFI; fully let single-tenant long-lease real estate.",
    riskImplication: "Lowest volume risk. Credit risk shifts to counterparty creditworthiness and ability to honour the commitment.",
  },
  {
    code: "V2",
    name: "Contracted with performance conditions",
    description: "A contract exists, but payment depends on the asset's actual output, availability, or performance meeting specified standards.",
    typicalSectors: "PPAs where the generator bears resource risk; rolling stock availability leases; PFI with performance deductions.",
    riskImplication: "Volume risk is transformed into operational/performance risk. Assessment focuses on gap between design and achievable performance.",
  },
  {
    code: "V3",
    name: "Partially contracted",
    description: "A proportion of capacity or output is committed under contract, with the remainder sold on a spot or short-term basis.",
    typicalSectors: "Power plant with 70% PPA + 30% merchant; port with minimum throughput commitment + spot cargo; data centre with anchor tenants + speculative capacity.",
    riskImplication: "Risk depends on the contracted proportion and quality of the uncontracted market. The coverage ratio of contracted revenue to debt service is a key metric.",
  },
  {
    code: "V4",
    name: "Demand-driven, essential / inelastic",
    description: "No contractual volume commitment, but demand is driven by essential need and is relatively price-inelastic. The service is a necessity with limited substitutes.",
    typicalSectors: "Regulated water utility; electricity distribution; commuter rail; urban road tolls; district heating; social housing.",
    riskImplication: "Low to moderate volume risk. Demand is structurally supported but can decline from demographic change, efficiency improvements, or policy shifts.",
  },
  {
    code: "V5",
    name: "Demand-driven, elastic / discretionary",
    description: "Volume depends on consumer or business choice and is meaningfully sensitive to price, competition, economic conditions, and behavioural change.",
    typicalSectors: "Airport passengers (leisure); discretionary retail; hotel leisure guests; self-storage; toll roads with free alternatives.",
    riskImplication: "High volume risk. Demand is cyclical and competitive. Requires traffic/demand studies, elasticity analysis, and sensitivity to economic downturn.",
  },
  {
    code: "V6",
    name: "Speculative / project-dependent",
    description: "Volume is highly uncertain, dependent on specific project outcomes, exploration success, development activity, or market creation.",
    typicalSectors: "Greenfield infrastructure in ramp-up; new-build speculative logistics; exploration-stage mining; early-stage clean tech; first-of-a-kind technology.",
    riskImplication: "Highest volume risk. Financial structure must accommodate a ramp-up period with potential for sub-economic utilisation.",
  },
];

export const DURATION_CATEGORIES: DurationCode[] = [
  {
    code: "D1",
    name: "Fully matched or over-hedged",
    description: "The revenue arrangement extends to or beyond debt maturity. There is no period of uncontracted revenue during the debt term.",
    riskImplication: "Lowest duration risk. No merchant tail. Refinancing risk may still exist if debt matures before the contract.",
  },
  {
    code: "D2",
    name: "Substantially matched (>80% coverage)",
    description: "The primary revenue arrangement covers more than 80% of the debt term. A short merchant tail exists but is a relatively small proportion of total debt service.",
    riskImplication: "Low duration risk. The merchant tail should be stress-tested but is unlikely to be the primary credit concern.",
  },
  {
    code: "D3",
    name: "Partially matched (50–80% coverage)",
    description: "The revenue arrangement covers 50–80% of the debt term. A significant merchant tail exists. The base case includes meaningful post-contract revenue assumptions.",
    riskImplication: "Moderate duration risk. The merchant tail is a material credit factor requiring independent stress on post-contract pricing and volume.",
  },
  {
    code: "D4",
    name: "Under-matched (<50% coverage)",
    description: "The revenue arrangement covers less than 50% of the debt term. The majority of the debt will be repaid from uncontracted or re-contracted revenue.",
    riskImplication: "High duration risk. Effectively a merchant credit for the majority of the debt term. Long-term credit depends on asset competitiveness and market position.",
  },
  {
    code: "D5",
    name: "No contracted revenue / fully merchant",
    description: "There is no long-term revenue arrangement. All revenue is earned on a merchant, spot, or short-term basis throughout the debt term.",
    riskImplication: "Highest duration risk. Revenue is entirely market-dependent from day one. Assessment is fully focused on market position, cost curve, and competitive dynamics.",
  },
];
