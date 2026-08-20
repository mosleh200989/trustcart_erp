# Steadfast Webhook

## Webhook Configuration

| Field              | Placeholder             |
|--------------------|-------------------------|
| Callback Url       | Callback Url here       |
| Auth Token(Bearer) | Type Auth Token here    |

**[Save]**

---

## Webhook Response Documentation

The webhook sends **POST** requests to the configured endpoint with JSON payloads based on the notification type.

### 1. Delivery Status Update

**Description:** This webhook notifies about changes in the delivery status of a consignment.

**Example Payload:**

```json
{
  "notification_type": "delivery_status",
  "consignment_id": 12345,
  "invoice": "INV-67890",
  "cod_amount": 1500.00,
  "status": "Delivered",
  "delivery_charge": 100.00,
  "tracking_message": "Your package has been delivered successfully.",
  "updated_at": "2025-03-02 12:45:30"
}
```

**Field Details:**

| Field Name        | Type              | Description                                                                                      |
|-------------------|-------------------|--------------------------------------------------------------------------------------------------|
| notification_type | string            | Fixed value: "delivery_status"                                                                   |
| consignment_id    | integer           | Unique ID of the consignment                                                                     |
| invoice           | string            | Invoice number associated with the consignment                                                   |
| cod_amount        | float             | Cash on delivery (COD) amount                                                                    |
| status            | string            | Current delivery status in between: pending, delivered, partial_delivered, cancelled, unknown     |
| delivery_charge   | float             | Delivery charge applied                                                                          |
| tracking_message  | string            | Status update message                                                                            |
| updated_at        | string (datetime) | Timestamp of the last update (YYYY-MM-DD HH:MM:SS)                                              |

### 2. Tracking Update

**Description:** This webhook sends tracking updates for a consignment.

**Example Payload:**

```json
{
  "notification_type": "tracking_update",
  "consignment_id": 12345,
  "invoice": "INV-67890",
  "tracking_message": "Package arrived at the sorting center.",
  "updated_at": "2025-03-02 13:15:00"
}
```

**Field Details:**

| Field Name        | Type              | Description                                                  |
|-------------------|-------------------|--------------------------------------------------------------|
| notification_type | string            | Fixed value: "tracking_update"                               |
| consignment_id    | integer           | Unique ID of the consignment                                 |
| invoice           | string            | Invoice number associated with the consignment               |
| tracking_message  | string            | Update message related to the package tracking               |
| updated_at        | string (datetime) | Timestamp of the last update (YYYY-MM-DD HH:MM:SS)          |

### Webhook Headers

| Header Name   | Value                                                    |
|---------------|----------------------------------------------------------|
| Content-Type  | application/json                                         |
| Authorization | Bearer {your_api_key} (if authentication is required)    |

### Response Handling

Your server should respond with an HTTP **200 OK** status if the webhook is processed successfully.

**Success Response:**

```json
{
  "status": "success",
  "message": "Webhook received successfully."
}
```

**Error Response (Example):**

```json
{
  "status": "error",
  "message": "Invalid consignment ID."
}
```
