# Inference Router

Implemented in `packages/inference-router` and `services/inference-router`.

Rules:

- public video/ad/intelligence can run on cloud-safe providers
- public tasks choose cheapest capable provider
- private strategy prefers local QVAC
- trading intent is local/hybrid only
- wallet/key material is blocked from cloud
- paid calls require quotes
- sensitive cloud routes require explicit approval
