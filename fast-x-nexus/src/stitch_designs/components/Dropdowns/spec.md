# Component D: Global Dropdown Spec

- **Stitch Project ID**: `10161058527401568088`
- **Screen ID**: `4b44fddbe82b42dabf53ce275c0a1cd5`
- **Screenshot URL**: [Stitch Generated Dropdown Screenshot](https://lh3.googleusercontent.com/aida/AP1WRLu3vUjrwu8eSnrhVFVluW2tq9d_78fj1jBw754m48F8XYxRloGYmbcZcoHQR1u6gNLgPj7IEc_ScIaOossr6bRpxGLCxTljigLDiJ9joIXA_9G85XcYefhcYOFSRvTcS1bAk3mNQjVCjTfLvJ-UJ70nCGelFvJh4Ft7Yl4Rgl-DNdCxgddSdCHLe7nwVQASrnU42o_6M5dbiCSk-9wMgLHWxbwJJvFQqVo2ZViXfZ_Y7behNBjcZfukXvk)
- **HTML/CSS Reference Code**: [HTML Reference Download](https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2M5MTgxMGUyOGMxYTQwNzhiOTJhM2MzZDg4NTFmYWZmEgsSBxD2iu2WrwwYAZIBJAoKcHJvamVjdF9pZBIWQhQxMDE2MTA1ODUyNzQwMTU2ODA4OA&filename=&opi=96797242)

## Design Specifications
*   **Theme**: Light Industrial Monolith (high contrast, clean, sharp, rectangular).
*   **Trigger Button**: Sharp, rectangular trigger button containing a status/profile text label and a chevron-down icon.
*   **Dropdown Menu Panel**:
    *   `Background`: `#FFFFFF`
    *   `Borders`: 1px solid `#E5E7EB` border.
    *   `Shadows`: Absolutely no drop shadows (uses 1px border separation).
*   **Menu Items**: Icon + label text rows in `#111827`.
    *   Options: "Available" (check icon), "In Transit" (local_shipping icon), "Delayed" (warning icon), "Maintenance" (build icon), separator line, "Profile Settings" (person icon).
*   **Active Item Style**: Uses a forest green `#347227` left border and text color accent, or brand gold `#E4A800` accent icon.
*   **Hover State**: Background `#F3F4F6` with a 4px brand forest green `#347227` left border accent.
*   **Interactions**:
    *   Outside-click listener to dismiss the menu.
    *   Keyboard navigation (Escape key to close, Arrow keys/Tab key focus trap).
*   **Geometry**: Strictly square/rectangular corners throughout (rounded-none).
