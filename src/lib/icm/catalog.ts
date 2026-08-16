export const PRODUCT_FAMILIES=['900 Series sliding systems','Pocket sliding systems','Frameless swing doors','Shower enclosures','Jalousie / Jalouplus','Fixed glass','Awning / casement','Bi-fold','Slide-up','Mullion','Glass railings','Canopies','Storefront','ACP','Roll-up','Screen doors','Tabletop / shelves','Aquarium'] as const
export const KNOWN_GLASS_HISTORY=[{thicknessMm:6,treatment:'annealed',color:'bronze'},{thicknessMm:10,treatment:'tempered',finish:'clear'},{thicknessMm:10,treatment:'tempered',finish:'frosted'},{thicknessMm:12,treatment:'tempered',finish:'clear'}] as const
export const PENDING_SOURCE_INGESTION=[
 {id:'tara-tagusao-source-set',customer:'Tagusao Construction and Trading Inc.',project:'Tara Hostel – El Nido',status:'PENDING',reason:'Original source documents must be ingested before exact commercial values are seeded.'},
 {id:'royal-suites-source-set',customer:'Royal Suites',project:'Port Barton shower partitions',status:'PENDING',reason:'Original source quotation must be ingested before exact commercial values are seeded.'}
] as const
