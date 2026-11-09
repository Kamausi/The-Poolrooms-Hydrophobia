# 0004 · Single player with an AI crew before online play

**Decision.** The other three crew members are AI. They cover the player, revive them (abstracted), follow the player's trail on foot and ride in the raft. There is no network code.

**Why.** Cooperative design (rescues, shared threats, pilot handoff) can be built and tested without a server. Online play needs a server, netcode and agreement on state (who has the cell, who sees the grab, pilot handoff on disconnect), and that is a separate project.

**What would change it.** A server and a networking owner. The events in `main.js` are the seam where shared state would go through.
