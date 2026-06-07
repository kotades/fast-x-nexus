# Component B: Global Sidebar Spec

- **Stitch Project ID**: `10161058527401568088`
- **Screen ID**: `2c44f40d86164188818e718f4fa680d8`
- **Screenshot URL**: [Stitch Generated Sidebar Screenshot](https://lh3.googleusercontent.com/aida/AP1WRLseCP2yIHr1fqIZhC7EbfjgPL_T8nEQ3nm8hzCN3ELAg1T-mLh5IxV4V4VKVRBd5Lywgurlxt7DK7Wbt7SzuJRF3e_MtbYxpCCaSDOQ_BsxkV2Me2LeaMIylATiH75GGueG3nRXoPsoM5tbSNrAIwYmfjpef5DyJuSHo9dV2Wfqw7pqC0XaJBThhIkrzJMvnB9ZgT1C1pKFIDd_HmBVoV59jrjdyfM7wWZJMTVcyqW-ozdnyhNT2OzociI)
- **HTML/CSS Reference Code**: [HTML Reference Download](https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzlhODA2YWM3MjFiNzRjNjU5MDNhYzk2YWI4NWNhZDk3EgsSBxD2iu2WrwwYAZIBJAoKcHJvamVjdF9pZBIWQhQxMDE2MTA1ODUyNzQwMTU2ODA4OA&filename=&opi=96797242)

## Design Specifications
*   **Theme**: Light Industrial Monolith (high contrast, clean, sharp, rectangular).
*   **Dimensions**: Width 256px, full height vertical navigation panel.
*   **Colors**:
    *   `Background`: `#F9FAFB`
    *   `Borders`: 1px `#E5E7EB` solid right border.
    *   `Typography/Text`: `#111827` (primary text), `#4B5563` (muted text/inactive icons).
*   **Header Logo**: Generous padding at the top showcasing the custom Fast X logo (`#347227` brand green with the gold `#E4A800` bar "E" in NEXUS).
*   **Navigation Groups & Items**:
    *   **Customer Group**: Dashboard, Bookings, Wallet, History.
    *   **Rider Group**: Active Jobs, Earnings, Route Map, Profile.
    *   **Admin Group**: Control Tower, User Mgt, Analytics, Ledger.
*   **Item Styles**:
    *   Full-width rows with left icon + label text.
    *   Strictly square corners (no border-radius, `rounded-none`).
    *   No drop shadows.
    *   **Active State (e.g. Dashboard)**: 4px solid left border in brand forest green (`#347227`) and background color `#F3F4F6`.
    *   **Inactive State**: Transparent background, no border, grey text/icon.
*   **Responsiveness**: Collapses to icon-only vertical strip on mobile screens.
