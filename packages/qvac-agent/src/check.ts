import { createQvacAgentTask } from "./index";
console.log(JSON.stringify(createQvacAgentTask({ prompt: "check", privacy: "public" }), null, 2));
