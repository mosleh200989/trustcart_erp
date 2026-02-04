# Courier Search API Documentation

[cite_start]The Courier Search API allows users to retrieve parcel delivery summaries and total parcel reports from various courier services (e.g., Steadfast, RedX, Pathao, Paperfly) based on a phone number[cite: 3].

---

## 1. Authentication
[cite_start]Users must provide a valid API key and a phone number to get the reports[cite: 4]. [cite_start]Your API Key is intended for your exclusive use with a single domain or application[cite: 58].

## 2. Base URLs
* [cite_start]**Individual Courier Summaries:** `https://dash.hoorin.com/api/courier/api` [cite: 6]
* [cite_start]**Total Parcel Summary:** `https://dash.hoorin.com/api/courier/sheet` [cite: 6]

---

## 3. Endpoints

### Retrieve Individual Courier Summaries
* [cite_start]**Endpoint:** `GET /api/courier/api` [cite: 8]
* [cite_start]**Description:** Retrieve parcel summaries from individual couriers[cite: 10].

### Retrieve Total Parcel Summary
* [cite_start]**Endpoint:** `GET /api/courier/sheet` [cite: 9]
* [cite_start]**Description:** Retrieve total summary of parcels[cite: 10].

---

## 4. Query Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `apikey` | string | [cite_start]The API key assigned to the user[cite: 12]. |
| `searchTerm` | string | [cite_start]The phone number to search for parcel delivery reports[cite: 12]. |

---

## 5. Example Requests

* [cite_start]**Individual courier summaries:** `https://dash.hoorin.com/api/courier/api?apiKey=your_api_key&searchTerm=01642444088` [cite: 15]

* [cite_start]**Total parcel summary:** `https://dash.hoorin.com/api/courier/sheet?apiKey=your_api_key&searchTerm=01642444088` [cite: 17]

---

## 6. Response Formats

### Courier Summaries (`/api/courier/api`)
[cite_start]The API returns a JSON object containing summaries of parcel deliveries and cancellations[cite: 19].

**Example Response:**
```json
{
  "Summaries": {
    "Steadfast": {
      "Total Parcels": 12,
      "Delivered Parcels": 12,
      "Canceled Parcels": 0
    },
    "RedX": {
      "Total Parcels": 10,
      "Delivered Parcels": 8,
      "Canceled Parcels": 2
    },
    "Pathao": {
      "Total Delivery": 22,
      "Successful Delivery": 22,
      "Canceled Delivery": 0
    }
  },
  "Details": []
}