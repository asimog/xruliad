import { createAuditRecord } from "./index";
createAuditRecord({ type: "execution", actor: "local_gateway", action: "check", status: "prepared" });
console.log("Audit boundary ok.");
