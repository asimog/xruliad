import { quoteUserLocalRequest, readUserLocalPaymentStatus } from "./index";
console.log(JSON.stringify({ status: readUserLocalPaymentStatus(), quote: quoteUserLocalRequest({ estimatedCostUsd: 0 }) }, null, 2));
