# Product Catalog Frontend Integration

Frontend handoff for the QuickDialog API's Meta-backed product catalog endpoints.

> **Source of truth:** products and catalogs are read from and written directly to Meta. QuickDialog does not maintain a local product table or synchronize a local catalog.
>
> **API prefix:** examples use `/api`, the repository's default `API_PREFIX`. If the deployment configures another prefix, replace `/api` accordingly.

## 1. Authentication and hotel isolation

Every endpoint in this document requires an authenticated hotel owner.

Send the access token as a bearer token:

```http
Authorization: Bearer <access-token>
```

Do not send a `hotelId` or a Meta access token in the request body. QuickDialog derives the hotel from the authenticated owner's JWT, loads that hotel's connected Meta account, decrypts its Meta token server-side, and checks that the selected catalog is accessible to that hotel's Meta business. A catalog ID from another hotel's Meta business is not accepted.

The API is configured for credentialed CORS and has a global origin guard. Browser requests must come from an allowed configured origin.

All request/response bodies are JSON. URLs in product requests must be absolute `http://` or `https://` URLs.

## 2. Endpoint summary

| Method | Endpoint | Purpose | Success status |
|---|---|---|---|
| `GET` | `/api/whatsapp/catalogs` | List Meta catalogs accessible to the authenticated hotel | `200 OK` |
| `GET` | `/api/whatsapp/catalogs/:catalogId/products` | List products in a selected catalog | `200 OK` |
| `POST` | `/api/whatsapp/catalogs/:catalogId/products` | Submit product creation to Meta | `202 Accepted` |
| `PATCH` | `/api/whatsapp/catalogs/:catalogId/products/:productId` | Submit a partial product update to Meta | `202 Accepted` |
| `DELETE` | `/api/whatsapp/catalogs/:catalogId/products/:productId` | Submit product deletion to Meta | `202 Accepted` |
| `GET` | `/api/whatsapp/catalogs/:catalogId/operations/:handle` | Check the status of a Meta batch operation | `200 OK` |

`:catalogId` is the Meta catalog ID selected in the UI. `:productId` is the QuickDialog product ID (the Meta retailer ID) returned by create or product listing. `:handle` is the batch handle returned by create, update, or delete.

## 3. Catalog listing

### Request

```http
GET /api/whatsapp/catalogs
```

No query parameters or request body.

### Response

Returns an array combining catalogs owned by and shared with the hotel's Meta business. Meta pagination is followed by the backend.

```json
[
  {
    "id": "123456789012345",
    "name": "Hotel Product Catalog",
    "product_count": 24
  }
]
```

`product_count` is optional and can be absent. Store/use the returned `id` as the `catalogId` for subsequent requests. The frontend may keep the currently selected catalog ID in its own UI state; the backend does not save a catalog selection.

## 4. Product listing and pagination

### Request

First page:

```http
GET /api/whatsapp/catalogs/123456789012345/products
```

Next page:

```http
GET /api/whatsapp/catalogs/123456789012345/products?after=<cursor>
```

Use `paging.cursors.after` from the preceding response as the next page's `after` query value. Omit `after` for the first page.

### Response

```json
{
  "data": [
    {
      "productId": "retailer-id-from-meta",
      "name": "House Blend Coffee",
      "description": "Freshly roasted coffee beans.",
      "productUrl": "https://shop.example.com/products/house-blend",
      "imageUrl": "https://cdn.example.com/products/house-blend.png",
      "availability": "in stock",
      "price": "12.50 USD",
      "currency": "USD",
      "brand": "Example Roasters",
      "condition": "new"
    }
  ],
  "paging": {
    "cursors": {
      "before": "optional-previous-cursor",
      "after": "optional-next-cursor"
    },
    "next": "optional-meta-next-page-value"
  }
}
```

`data` may be empty. Product fields other than `productId` and `name` may be `null` when Meta has no value for them. Paging properties are optional; only request another page when `paging.cursors.after` is present.

The frontend should use `productId` for update/delete—not Meta's internal Graph object ID. Meta's `retailer_id` is used as `productId`; if Meta omits it, the backend currently falls back to Meta's `id`.

**Price response detail:** `price` is returned as Meta provides it and may contain both amount and currency, e.g. `"12.50 USD"`. `currency` is also returned separately when Meta provides it. Do not assume the response's `price` is only the decimal amount.

## 5. Create product

### Request

```http
POST /api/whatsapp/catalogs/123456789012345/products
Content-Type: application/json
```

All fields below are required by the current create schema:

```json
{
  "name": "House Blend Coffee",
  "description": "Freshly roasted coffee beans.",
  "productUrl": "https://shop.example.com/products/house-blend",
  "imageUrl": "https://cdn.example.com/products/house-blend.png",
  "price": "12.50",
  "currency": "USD",
  "availability": "in stock",
  "brand": "Example Roasters",
  "condition": "new"
}
```

The frontend supplies the image as a **public image URL**, not as PNG/JPEG bytes or a file upload. Meta must be able to fetch the URL directly. Upload/hosting of the image is outside these API endpoints.

The `productUrl` field is the public page for the product that a shopper should visit. Its Meta field name is `link`. It is not the image URL and should not point to the QuickDialog admin/catalog screen.

The frontend does **not** send `productId` on create. The backend generates a UUID and sends it to Meta as the product's retailer ID. The returned `productId` must be retained for later update/delete operations.

### Field constraints

| Field | Type/constraints | Notes |
|---|---|---|
| `name` | String, trimmed, 1–200 chars | Sent to Meta as `title` |
| `description` | String, trimmed, 1–5000 chars | Required by Meta product create |
| `productUrl` | Absolute HTTP(S) URL | Shopper-facing product destination; Meta `link` |
| `imageUrl` | Absolute HTTP(S) URL | Public image URL; sent in Meta's `image` URL object |
| `price` | String matching positive digits with up to 2 decimals, e.g. `12.50` | Do not include currency in this input field |
| `currency` | Three uppercase letters, e.g. `USD` | Backend combines it with price for Meta, e.g. `12.50 USD` |
| `availability` | `in stock`, `out of stock`, `available for order`, `discontinued` | Exact lowercase values |
| `brand` | String, trimmed, 1–100 chars | Required by Meta product create |
| `condition` | `new`, `refurbished`, `used` | Exact lowercase values |

The backend maps these fields to Meta's product fields: `name → title`, `productUrl → link`, `imageUrl → image: [{url}]`, and `price + currency → price` formatted as `"<amount> <ISO currency>"`. It sends `item_type=PRODUCT_ITEM` with a `CREATE` batch request and `allow_upsert=false`.

### Response: Meta already finished

The endpoint always returns HTTP `202 Accepted` for a submitted write, even if its immediate status check says it has already finished.

```json
{
  "productId": "a5d0a608-85a2-49ea-8d2c-dfac2b167821",
  "handle": "meta-batch-handle-value",
  "status": "finished",
  "errors": [],
  "warnings": [],
  "products": [
    {
      "productId": "a5d0a608-85a2-49ea-8d2c-dfac2b167821",
      "name": "House Blend Coffee",
      "description": "Freshly roasted coffee beans.",
      "productUrl": "https://shop.example.com/products/house-blend",
      "imageUrl": "https://cdn.example.com/products/house-blend.png",
      "availability": "in stock",
      "price": "12.50 USD",
      "currency": "USD",
      "brand": "Example Roasters",
      "condition": "new"
    }
  ],
  "paging": {
    "cursors": {}
  }
}
```

`products` is the refreshed first page from Meta. The frontend can replace/refetch its current catalog view. The generated `productId` is provided in the operation response even if the batch is not finished yet.

### Response: Meta still processing

If the immediate status check is not finished, the response contains the operation fields but omits `products` and `paging`:

```json
{
  "productId": "a5d0a608-85a2-49ea-8d2c-dfac2b167821",
  "handle": "meta-batch-handle-value",
  "status": "started",
  "errors": [],
  "warnings": []
}
```

Poll the operation-status endpoint using the returned `catalogId` and `handle`.

## 6. Update product

### Request

```http
PATCH /api/whatsapp/catalogs/123456789012345/products/a5d0a608-85a2-49ea-8d2c-dfac2b167821
Content-Type: application/json
```

Send one or more supported product fields. Every field is optional individually, but the request body must include at least one field.

```json
{
  "price": "14.00",
  "currency": "USD",
  "availability": "out of stock"
}
```

Supported update fields are the same as create: `name`, `description`, `productUrl`, `imageUrl`, `price`, `currency`, `availability`, `brand`, `condition`. Update values use the same validation constraints as create. Unspecified fields are left unchanged.

If either `price` or `currency` is sent, the backend fetches the current product from Meta and preserves the omitted half. For example, `{ "price": "14.00" }` preserves existing currency; `{ "currency": "EUR" }` preserves existing amount.

### Response

HTTP `202 Accepted`, same operation response shape as create. It includes `productId`, `handle`, `status`, `errors`, and `warnings`; when status is finished it also includes refreshed `products` and `paging`.

## 7. Delete product

### Request

```http
DELETE /api/whatsapp/catalogs/123456789012345/products/a5d0a608-85a2-49ea-8d2c-dfac2b167821
Authorization: Bearer <access-token>
```

No request body. Keep the `productId` from the product list/create response; deletion is submitted to Meta using that retailer ID.

### Response

HTTP `202 Accepted`. When Meta is still processing:

```json
{
  "handle": "meta-batch-handle-value",
  "status": "scheduled",
  "errors": [],
  "warnings": []
}
```

When Meta has finished immediately, the response additionally includes `products` (the refreshed first page) and `paging`. The delete response does not include `productId`; the frontend already has it in the request path.

## 8. Poll operation status

### Request

```http
GET /api/whatsapp/catalogs/123456789012345/operations/meta-batch-handle-value
Authorization: Bearer <access-token>
```

Call this only when a create/update/delete response has a `status` other than `finished`.

### Response while not finished

```json
{
  "handle": "meta-batch-handle-value",
  "status": "started",
  "errors": [],
  "warnings": []
}
```

### Response when finished

```json
{
  "handle": "meta-batch-handle-value",
  "status": "finished",
  "errors": [],
  "warnings": [],
  "products": [
    {
      "productId": "a5d0a608-85a2-49ea-8d2c-dfac2b167821",
      "name": "House Blend Coffee",
      "description": "Freshly roasted coffee beans.",
      "productUrl": "https://shop.example.com/products/house-blend",
      "imageUrl": "https://cdn.example.com/products/house-blend.png",
      "availability": "in stock",
      "price": "12.50 USD",
      "currency": "USD",
      "brand": "Example Roasters",
      "condition": "new"
    }
  ]
}
```

`products` is included after completion; this status endpoint does not include `paging`. It is the refreshed first page, not necessarily every product in a large catalog.

Meta does not publish a guaranteed processing time. Do not interpret a still-processing state as a failure. A reasonable client policy is to poll with a delay and backoff (e.g. 1s, 2s, 4s, then every 5s), stop polling after a UI-defined timeout, and allow the user to check again later. Do not poll in a tight loop.

The backend passes through Meta's status string. The implementation currently treats the exact string `finished` as completed; all other status values are returned as not finished. Continue polling when status is not `finished`.

## 9. Error responses

Errors use the API's normalized envelope:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": [
    {
      "field": "currency",
      "message": "Invalid input"
    }
  ],
  "path": "/api/whatsapp/catalogs/123/products",
  "requestId": "request-uuid",
  "timestamp": "2026-11-12T12:00:00.000Z"
}
```

`details` is optional and varies by error.

| Status | Typical cause | Frontend handling |
|---|---|---|
| `400` | Invalid body/query, no hotel on authenticated user, or Meta product validation/processing error | Show validation message; use `details` if present |
| `401` | Missing/expired/invalid access token | Re-authenticate |
| `403` | User lacks owner permission, origin blocked, or throttled policy depending on code | Show access/rate-limit handling |
| `404` | Catalog not accessible to this hotel, product not found during price update, or no active Meta account | Refresh catalog/account state; don't retry blindly |
| `502` | Meta returned an API error | Show a safe retry/help message; API error details may include Meta status/code/type/message |
| `503` | Meta network/service unavailable or Meta returned no batch handle | Allow retry; don't assume the product operation completed |
| `429` | Rate limit | Retry later with backoff |

Meta may return warnings even when an operation finishes. Display/log warnings where useful; a warning does not necessarily mean the change failed. Batch errors are returned as a normalized error response rather than a successful operation result.

## 10. Suggested frontend flow

1. Load `GET /api/whatsapp/catalogs` and let the owner choose a catalog.
2. Load `GET .../:catalogId/products`; retain each row's `productId` and pagination cursor.
3. For create, upload/host the image outside these API endpoints and obtain a public URL, then submit all required create fields.
4. For update/delete, use the row's `productId` in the URL.
5. If a write response has `status === "finished"`, replace/refetch the product list from its returned `products` or call the list endpoint.
6. Otherwise poll `GET .../operations/:handle` with backoff. Once it returns `finished`, replace/refetch product data.
7. Handle standard API errors using `statusCode`, `code`, `message`, and optional `details`.

## 11. Important implementation boundaries

- No local product database, product sync, or worker is involved.
- The backend uses the Meta connection stored for the authenticated owner's hotel; Meta credentials never come from the frontend.
- Catalog selection is frontend state, but every backend operation revalidates that catalog against the hotel's Meta business.
- The image must be hosted at a stable URL that Meta can fetch. This API does not accept multipart files or raw PNG/JPEG bytes.
- The product destination is `productUrl` in QuickDialog and `link` in Meta. The image destination is `imageUrl` in QuickDialog and Meta's image URL object.
- The product create operation requires `brand`, `condition`, product URL, and image URL in addition to name, description, price/currency, and availability.
