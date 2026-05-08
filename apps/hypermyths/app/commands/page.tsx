import { TerminalRoutePage } from "../terminal-route-page";

export default function Page() {
  return <TerminalRoutePage title="Commands" summary="Collaborative units of work for users and agents." badges={["Web available", "Platform payment"]} items={["Run command", "Contribute evidence", "Contribute model output", "Contribute media", "Quote cost", "Display output"]} />;
}
