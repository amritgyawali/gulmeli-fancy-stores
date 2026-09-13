# Stitch migration inventory

Inspected all 34 supplied files before app implementation: 10 HTML exports and 24 screenshots. No pre-existing application, backend, package configuration, standalone font files or git repository existed at the source root. Original contents remain untouched, organized under `designs/stitch/` and `designs/references/` at the project root. Source names in the table are relative to `designs/stitch/`; file paths in the manifests are relative to the project root.

| Screen | Source | Route | State and connections |
| --- | --- | --- | --- |
| Home | daraz_app_home_screen | / | Four bottom tabs; Buy More Save More shortcut and floating promotion → /offers; feed tabs; collect vouchers |
| Messages | daraz_app_messages_screen | /messages | Five bottom items; mark read; Alerts/Promos filter existing feed |
| Cart | daraz_app_cart_screen | /cart | Five bottom items; item/group/all selection, quantity, remove selected, recommendations, voucher input, scroll to top |
| Account | daraz_app_account_screen_1 | /account | Base layout, profile counters, promos, orders, recent items, services |
| Account selected order | daraz_app_account_screen_2 | /account | Five existing order summary states |
| Account swipe | daraz_app_account_screen_with_swipe_tabs | /account | Horizontal order summary paging and selected state |
| Account refresh | daraz_app_account_screen_with_pull_to_refresh | /account | Pull-to-refresh behavior |
| Account shimmer | daraz_app_account_screen_with_shimmer_refresh | /account | Loading skeleton state |
| Account updated | daraz_app_account_screen_with_dynamic_refresh_updates | /account | Refresh service boundary and updated data state |
| Buy More Save More | daraz_buy_more_save_more_offer_screen | /offers | Search/filter existing grid, category tabs, add to cart, live totals, cart destination, scroll to top |

The six account HTML files are successive interaction variants of one screen, not six destinations. The final account combines the supplied swipe/refresh/shimmer behaviors. Demo-only refresh controls and simulated phone status bars are omitted per the request to remove debug controls and use actual native system areas.

Screenshot-only files map to scroll/data variants: img_2935–2938 → Home; img_2939, img_2942–2943 → Messages; img_2940, img_2944–2946 → Cart; img_2941, img_2947–2948 → Account. They are original phone reference captures; generated HTML contains different illustrations/images. The paired generated HTML/screen.png takes precedence for native migration. No extra page is implied by these images.

Reusable native pieces: typography, source SVG icons, buttons, checkbox, badges, product images/cards, quantity selector, custom bottom navigation and section headings. Screen-specific headers, grids, banners, illustrations and spacing remain screen-specific.

No dynamic product/order/category destination is fabricated: no corresponding detail design exists. IDs still identify catalog records and cart lines. Product data is centralized, not copied into each screen.
