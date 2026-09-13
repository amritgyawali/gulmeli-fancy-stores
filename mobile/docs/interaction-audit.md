# Interaction audit

`Missing design` means the original control is preserved, shows an unavailable alert, and has an explicit TODO in `services/missing-design.ts` and `docs/missing-designs.md`. It does not route to an unrelated destination.

| Screen | Element | Implemented action | Status |
| --- | --- | --- | --- |
| All | Home / Messages / Cart / Account bottom tabs | Expo Router navigation to the corresponding supplied route | Connected |
| Messages / Cart / Account | Center promotion | `/offers` | Connected |
| Home | BMSM shortcut / floating promotion | `/offers` | Connected |
| Home | Search / visual search / digital goods | Preserve query; unavailable destination alert | Missing design |
| Home | Brandhouse, sale, campaign and category cards | Named destination alert | Missing design |
| Home | Collect All | Idempotent local voucher collection; persistent state and Account counter | Working locally |
| Home | More vouchers | Voucher wallet alert | Missing design |
| Home | Flash/Bachat/ranking/product cards | Named product/category destination alert | Missing design |
| Home | Feed tabs | For You, voucher and fast-delivery filters; Hot deals discount ordering | Working locally |
| Offers | Search icon / Search field / submit / clear | Focus, filter same supplied grid, reset query | Working locally |
| Offers | Camera / ellipsis | Named unavailable alert | Missing design |
| Offers | Category icons / Pick You Like / filter tabs | Filter supplied products within the existing grid | Working locally |
| Offers | Product image/title | Product details alert | Missing design |
| Offers | Product cart button | Add correct product ID; aggregate existing line; cap stock | Working locally |
| Offers | Cart summary icon | `/cart` | Connected |
| Offers | Check Out | Checkout alert; no false order/payment success | Missing design |
| Offers / Cart | Floating upward arrow | Scroll owning list to top | Working |
| Cart | Individual, Choice, other seller group and All checkboxes | Synchronized selected state and totals | Working locally |
| Cart | Quantity −/+ | Clamp to 1 and available stock; update totals and badges | Working locally |
| Cart | Delete | Remove selected cart lines and persist | Working locally |
| Cart | View All / View Less | Expand/collapse additional cart lines | Working locally |
| Cart | Out-of-stock checkbox | Disabled; unavailable record cannot be selected or added | Working |
| Cart | Recommendations add button | Add shared product to persisted cart | Working locally |
| Cart | Voucher input | Native text entry; validation unavailable until backend contract exists | Backend required |
| Cart | Voucher pill / Choice / Pick / seller / Find Similar | Named unavailable alert | Missing design |
| Cart | Check Out | Checkout alert | Missing design |
| Account | Five order tabs, dots and horizontal swipe | Supplied summary states, selection and paging | Working locally |
| Account | To Pay → Shop Now | `/` | Connected |
| Account | BMSM | `/offers` | Connected |
| Account | Pull-to-refresh | Await account service, show supplied shimmer state, restore selected summary | Working locally |
| Account | Avatar, Settings and profile counters | Named destination alert | Missing design |
| Account | View All Orders / Check Updates / Track Order / Review Now / History | Named destination alert | Missing design |
| Account | Recent products / View More | Details/history alert | Missing design |
| Account | Gems / Freebie / service icons | Named destination alert | Missing design |
| Messages | Mark all as read | Clear unread badges across screens; persist | Working locally |
| Messages | Alerts / Promos | Filter original feed; second tap restores all | Working locally |
| Messages | Chats / Orders | Named unavailable alert | Missing design |
| Messages | Promotion banner | Named promotion/Gems destination alert | Missing design |

No visible back arrow exists in the supplied designs. Expo Router provides native history/hardware-back behavior and deep-linkable supplied routes. Device back gestures still require Android/iOS runtime validation.
