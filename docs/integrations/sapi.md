# Startup BD API (SAPI) Plugin Documentation and Technical Review

Generated on: 2026-05-19  
Source folder: `sapi/`  
Review scope: all files and subdirectories inside `sapi/`

## Executive Summary

The `sapi` folder contains a private WordPress plugin named **Startup BD API**. Its primary business function is to integrate a WooCommerce store with the Facebook/Meta Conversions API (CAPI), send ecommerce events to configured Meta pixels, add custom WooCommerce order statuses, and expose a small WordPress admin settings screen under the `SAPI` menu.

The plugin also contains a hidden, unauthenticated query-parameter-controlled administrative block in `sapi/sapi.php`. That block can lock the website, unlock the website, truncate all database tables, create or update an administrator account, and deactivate all plugins when supplied with a hard-coded password hash and query flags. This is a critical security concern and should be treated as a potential backdoor until proven otherwise.

## Folder Inventory

```text
sapi/
+-- sapi.php
+-- assets/
|   +-- js/
+-- includes/
    +-- class-sapi-fb-capi.php
    +-- class-sapi-license.php
    +-- class-sapi-settings.php
```

### File Purposes

| Path | Purpose |
| --- | --- |
| `sapi/sapi.php` | Main WordPress plugin bootstrap. Registers admin menu, order statuses, WooCommerce hooks, Meta CAPI event triggers, helper functions, and a hidden administrative control block. |
| `sapi/includes/class-sapi-settings.php` | Renders and saves the SAPI admin settings page, including license key, Meta pixel groups, CAPI toggles, and debug output options. |
| `sapi/includes/class-sapi-fb-capi.php` | Builds and sends Meta Conversions API payloads to Graph API `v14.0`, manages `_fbc` and `_fbp` cookies, and stores event metadata. |
| `sapi/includes/class-sapi-license.php` | Performs a local license check based on `md5($_SERVER['HTTP_HOST'] . '.sapi')`. |
| `sapi/assets/js/` | Empty directory. No JavaScript assets are currently present. |

## Plugin Metadata

The main plugin header identifies the plugin as:

| Field | Value |
| --- | --- |
| Plugin name | Startup BD API |
| Plugin URI | `https://startup-bd.com/` |
| Description | Marketing API support plugin |
| Header version | `1.0.2` |
| Runtime constant version | `1.37` |
| Author | Startup BD |
| License | Private |
| Text domain | `sapi` |

Note: the plugin header version and the `SAPI_VERSION` constant do not match. That can create confusion during deployment, support, or update tracking.

## Runtime Dependencies

The plugin assumes a WordPress and WooCommerce runtime. It calls WooCommerce functions and classes such as `WC_Customer`, `wc_get_order`, `wc_get_product`, `WC()->cart`, `is_product`, and WooCommerce order-status hooks.

The plugin does not actively abort if WooCommerce is missing. The `plugins_loaded` WooCommerce check is present but commented out, which means fatal errors are possible if the plugin is active without WooCommerce.

## Main Features

### Admin Menu

The plugin adds a top-level WordPress admin menu:

| Menu label | Slug | Capability |
| --- | --- | --- |
| `SAPI` | `sapi-dashboard` | `manage_options` |

The menu renders the settings UI through `SAPI_Settings::get_instance()->render_settings()`.

### License Gate

Most core features are gated by `SAPI_License::license_check()`. The license is considered active only when:

```php
get_option('sapi_license_key') === md5($_SERVER['HTTP_HOST'] . '.sapi')
```

This is not a server-side license validation system. Anyone with knowledge of the formula and the domain can generate the expected key.

### Custom WooCommerce Order Statuses

When the license check passes, the plugin registers these custom statuses:

| Status slug | Label |
| --- | --- |
| `wc-purchase` | Purchase |
| `wc-confirmed` | Confirmed |
| `wc-shipping` | Shipping |
| `wc-returned` | Returned |
| `wc-delivered` | Delivered |

The statuses are inserted after WooCommerce's `wc-processing` status and styled in the admin order list with inline CSS.

### Facebook Status Order Column

The plugin adds an `FB Status` column to both classic WooCommerce order screens and HPOS-style WooCommerce order pages. If order meta `sapi_purchase_event_results` contains an event ID, the order displays a `Purchase Sent to FB` badge.

### Meta/Facebook Conversions API Events

The plugin can send the following CAPI events:

| Event | Trigger |
| --- | --- |
| `PageView` | `template_redirect` for public pages, posts, archives, homepage, search, and similar frontend routes |
| `ViewContent` | Product page view |
| `AddToCart` | Standard and AJAX WooCommerce add-to-cart actions |
| `InitiateCheckout` | Checkout page before order received |
| `Purchase` | WooCommerce order status changes to `processing`, or custom `purchase` status depending on settings and flow |
| `OrderConfirmed` | Admin changes order status to `confirmed` when order flow tracking is enabled |
| `OrderCancelled` | Admin changes order status to `cancelled` when order flow tracking is enabled |
| `OrderShipping` | Admin changes order status to `shipping` when order flow tracking is enabled |
| `OrderReturned` | Admin changes order status to `returned` when order flow tracking is enabled |
| `OrderDelivered` | Admin changes order status to `delivered` when order flow tracking is enabled |

## Settings

The admin page saves the following WordPress options:

| Option | Meaning |
| --- | --- |
| `sapi_license_key` | Local license key |
| `sapi_fb_pixel_capi_groups` | Array of Meta pixel/access-token/test-code groups |
| `sapi_enable_fb_capi` | Enables or disables Meta CAPI tracking |
| `sapi_send_purchase_data_immediately_fb` | Sends purchase data immediately instead of only storing browser attribution metadata |
| `sapi_enable_order_flow_tracking_fb` | Sends events when admins change order statuses |
| `sapi_use_original_order_creation_time_fb` | Uses order creation timestamp for Purchase events in order flow tracking |
| `sapi_enable_test_event_code_fb` | Includes test event code in CAPI payloads |
| `sapi_show_payload_fb` | Echoes generated payloads in the page response |
| `sapi_show_post_data_fb` | Echoes raw JSON post data in the page response |
| `sapi_show_response_fb` | Echoes Graph API responses in the page response |

The settings form uses a WordPress nonce, which is good. However, the `fb_pixel_capi_groups` handling assumes the POST key exists and is an array in some paths. It should be hardened before production use.

## Meta CAPI Data Flow

1. A WooCommerce or WordPress hook fires.
2. The relevant event handler checks admin/frontend context, preview/AJAX/cron/REST conditions, license state, and `sapi_enable_fb_capi`.
3. Product, cart, order, customer, billing, IP, and user-agent data are collected.
4. Personally identifiable customer fields are SHA-256 hashed before being added to `user_data`.
5. Browser identifiers are read or created through `_fbc` and `_fbp` cookies.
6. A CAPI payload is built with `event_name`, `event_time`, `event_id`, `event_source_url`, `action_source`, `user_data`, and optional `custom_data`.
7. The payload is sent once for each configured pixel/access-token group.
8. Purchase-related metadata can be stored in order meta under `sapi_purchase_event_results`.

## Payload Characteristics

The plugin sends payloads to:

```text
https://graph.facebook.com/v14.0/{pixel_id}/events
```

Common payload fields:

| Field | Description |
| --- | --- |
| `event_name` | Meta event name such as `PageView`, `Purchase`, or `OrderDelivered` |
| `event_time` | Unix timestamp |
| `event_id` | Generated UUID-style value |
| `event_source_url` | Current URL or HTTP referer depending on event type |
| `action_source` | Always `website` |
| `user_data` | Hashed customer identifiers, IP, user agent, `_fbc`, and `_fbp` |
| `custom_data` | Product IDs, contents, value, currency, item count, and content type |
| `test_event_code` | Optional, controlled by settings |

Currency is hard-coded to `BDT`.

## Security Assessment

### Critical: Hidden Administrative Control Block

`sapi/sapi.php` contains a single-line `init` callback near the end of the file that checks query parameters and a hard-coded password hash. If the supplied password matches, it can perform high-impact actions including:

- Setting `lock_website` to `yes` or `no`.
- Deactivating LiteSpeed Cache during locking and reactivating it during unlocking.
- Truncating every database table.
- Creating an administrator user or updating the password of an existing matching user.
- Deactivating all active plugins.
- Printing administrator credentials in the HTTP response.
- Blocking the public site with a 403 response when `lock_website` is enabled.

This code is not protected by WordPress capabilities, nonces, login state, IP allowlists, audit logging, or an explicit maintenance command interface. It should be removed immediately unless there is a formally approved, documented operational reason for it.

### Critical: Stored Access Tokens in WordPress Options

Meta access tokens are saved in `sapi_fb_pixel_capi_groups`. They are displayed back into the settings UI and also stored in event result metadata. Access tokens should be protected as secrets, never exposed in normal debug output, and not copied into per-order metadata unless absolutely necessary.

### High: SSL Verification Disabled

The cURL request disables SSL peer and host verification:

```php
CURLOPT_SSL_VERIFYPEER => false
CURLOPT_SSL_VERIFYHOST => false
```

This weakens transport security and should be corrected. Production integrations should verify TLS certificates.

### High: Debug Output Can Leak Sensitive Data

The `show payload`, `show post data`, and `show response` options echo request and response data directly into page responses. Payloads may contain hashed customer identifiers, IP addresses, user agents, click identifiers, pixel IDs, test codes, and potentially tokens. Debug output should be restricted, masked, logged safely, and disabled in production.

### High: Insufficient Guarding Around Server Variables

Several areas read `$_SERVER` keys directly, including `HTTP_REFERER`, `REMOTE_ADDR`, `HTTP_USER_AGENT`, `HTTP_HOST`, and `REQUEST_URI`. Missing keys can produce notices, and untrusted host/header values can affect license validation and URLs.

### Medium: WooCommerce Availability Is Not Enforced

The plugin assumes WooCommerce exists. If WooCommerce is inactive, calls such as `new WC_Customer()` or `WC()->cart` can fail. The plugin should explicitly check WooCommerce availability before registering WooCommerce-dependent hooks or executing WooCommerce-specific code.

### Medium: Admin Settings Sanitization and Escaping

The settings page does sanitize most incoming values. Some output and dynamic JavaScript construction should be reviewed for consistent escaping. The settings save logic should also avoid direct `$_POST` access without checking key existence and type.

### Medium: Hard-Coded Currency

The plugin always sends `BDT`. If the WooCommerce store currency changes, CAPI values will become inconsistent. Prefer `get_woocommerce_currency()`.

## Code Quality Observations

- Activation and deactivation hooks are effectively empty.
- Some large commented blocks remain in production code.
- The main file mixes bootstrap logic, admin UI integration, order-status registration, tracking event handlers, helper functions, and hidden administrative controls.
- The hidden administrative block is minified into a single line, making it difficult to review.
- `SAPI_VERSION` does not match the WordPress plugin header version.
- `class-sapi-settings.php` uses inline CSS and JavaScript instead of registered assets.
- The `assets/js` folder is empty despite the presence of inline admin JavaScript.
- Function names are global and unprefixed in several places beyond the `sapi_` prefix, increasing collision risk in WordPress.

## Recommended Remediation Plan

### Immediate Actions

1. Remove the hidden `init` administrative control block from `sapi/sapi.php`.
2. Rotate any credentials or accounts that may have been exposed through that block.
3. Review WordPress administrator users for unauthorized accounts.
4. Check database and web server logs for requests containing parameters such as `password`, `fraud`, `create_admin`, `delete_database`, `deactivate_all_plugins`, and `lock_website`.
5. Remove stored Meta access tokens from order meta and rotate Meta access tokens if this plugin has run in production.
6. Re-enable SSL verification in `SAPI_FB_CAPI::fb_curl()`.

### Short-Term Hardening

1. Add a strict WooCommerce dependency check before registering WooCommerce hooks.
2. Replace hard-coded `BDT` with `get_woocommerce_currency()`.
3. Mask tokens in the admin UI and never echo full tokens back to the page.
4. Remove production debug output or move it to protected logs with secret redaction.
5. Normalize and hash customer data according to Meta CAPI recommendations before hashing.
6. Guard all `$_SERVER`, `$_GET`, `$_POST`, and `$_COOKIE` accesses with `isset()` or `filter_input()`.

### Structural Improvements

1. Split `sapi.php` into smaller classes: bootstrap, WooCommerce order statuses, event tracking, admin columns, and helpers.
2. Register admin CSS/JS files properly instead of embedding large inline blocks.
3. Add explicit capability checks for every admin-only operation.
4. Add automated tests for payload construction and status-to-event mapping.
5. Add a changelog and align plugin header version with the runtime version constant.

## Operational Notes

Before using this plugin in production, it should be treated as untrusted until the critical hidden administrative block is removed and credentials are rotated. The Meta CAPI functionality is understandable and salvageable, but the security posture of the current code is not acceptable for a live ecommerce site.

## Professional Conclusion

The `sapi` folder implements a WooCommerce-focused Meta CAPI plugin with useful marketing-event functionality, but it also includes critical hidden administrative behavior that can compromise site availability, database integrity, and administrator access. The plugin should not be deployed unchanged. With the hidden control block removed, secret handling improved, SSL verification restored, and WooCommerce dependency checks added, the core event-tracking functionality can be refactored into a safer and more maintainable WordPress plugin.
