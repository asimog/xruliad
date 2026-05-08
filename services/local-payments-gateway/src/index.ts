import { readUserLocalPaymentStatus } from "@hypermyths/user-local-payments";
console.log(JSON.stringify({ gateway: "local-payments", endpoints: ["GET /health", "GET /capabilities", "GET /spend-policy", "POST /quote", "POST /approve", "POST /execute-paid-request", "GET /receipts", "GET /receipts/:id"], status: readUserLocalPaymentStatus() }, null, 2));
