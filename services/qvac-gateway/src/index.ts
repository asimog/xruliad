import { readQvacStatus } from "@hypermyths/qvac";
console.log(JSON.stringify({ gateway: "qvac", status: readQvacStatus(), note: "Optional local/private inference boundary; web usage does not require QVAC." }, null, 2));
