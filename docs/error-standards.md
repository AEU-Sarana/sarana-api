# Error Response Standard

All API error responses must use the same JSON shape:

```json
{
  "success": false,
  "message": "Human readable error message",
  "code": "ERROR_CODE",
  "errors": [],
  "details": {}
}
```

## Field Rules
- `success`: always `false` for error responses.
- `message`: human-readable summary of the error.
- `code`: stable, machine-readable error code.
- `errors`: optional, used for validation errors (array of field errors).
- `details`: optional, for extra metadata (never required by clients).

## Examples

Validation error:
```json
{
  "success": false,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "errors": [
    { "field": "email", "message": "Invalid email address" }
  ]
}
```

Business logic error:
```json
{
  "success": false,
  "message": "Product code already exists",
  "code": "PRODUCT_CODE_EXISTS"
}
```

Authorization error:
```json
{
  "success": false,
  "message": "Insufficient permissions",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```
