export type CaseFile = { id: string; title: string; classification: string; body: string };
export const caseFiles: CaseFile[] = [
  { id: "01", title: "The Last Minute", classification: "Extreme priority · Decrypted at 4:24 PM", body: `RADIO MERIDIAN — OFF-AIR TRANSCRIPT (INCIDENT 02:13)

02:10:11 / ADRIAN VALE (HOST): “You are listening to Meridian. Stay with me.”

02:11:03 / SYSTEM WARNING: A secondary, low-frequency hum bleeds into the mix. The desk meter registers a live, breathing carrier wave—even though the microphone is dead.

02:13:02 / ADRIAN (Frantic): “I have checked the master clock. This is not a replay. It’s... it’s happening right now.”

02:13:47 / EVENT: Programme output violently cuts to silence. The automated emergency backup tape never triggers.

ENGINEER’S SCRAWL: The studio remained powered for exactly 14 seconds after the broadcast died. When security breached the doors, Adrian’s chair was spinning. The room was empty. The exterior door counter did not tick up. He never left.

PENCIL NOTE RECOVERED FROM DESK: “87.6 is the programme. The other frequency is a passenger. Follow the interval, not the volume. ...if this recording survives, don't trust the— [STATIC]”` },
  { id: "02", title: "The Ghost Carrier", classification: "Signal analysis · Restricted", body: `SIGNAL LAB / COMPARISON SHEET

We ran the anomaly through the ECHO diagnostic system. The results are impossible.

Archive 1986: Residual pulse detected. Interval: 47 seconds.
Archive 2004: Residual pulse detected. Interval: 47 seconds.
Current Programme: Identical pulse. No matching input channel.

Adrian named it THE GHOST CARRIER. It is a parasite. It travels directly beneath ordinary speech and music. Removing the Studio A input doesn't kill it.

ADRIAN’S URGENT MEMO: “How can the same damaged interval appear in tapes recorded decades apart? ECHO saw the pattern before we did. The next scheduled route leaves the building. Do not call it interference until we know what it carries. It’s alive.”` },
  { id: "03", title: "Room Zero", classification: "Internal facility record", body: `FACILITIES / ACCESS AUDIT

The public blueprints show Studio A, the archives, a service corridor, and a transformer bay. They are lying. Deep scan reveals Maintenance Circuit Z-0 is active. Its destination is heavily redacted.

02:12:31: Adrian’s badge accesses the service corridor.
02:13:48: Interior latch Z-0 accepts his badge.
02:14:03: NO PERIMETER EXIT RECORDED.

CCTV ANOMALY: Camera 3 shows an empty corridor, but the timestamp is a lie. It is offset by 19 seconds. The electrical fluctuation we saw on tape belongs to a secondary, hidden transmitter—not a power surge.

Maintenance labels identify Z-0 as ROOM ZERO. It houses an isolated secondary broadcast desk. A torn, blood-smudged note was found near the latch: “If they search only the exits, they will believe I vanished.”` },
  { id: "04", title: "The Final Transmission", classification: "Quarantine directive", body: `ISOLATED ARCHIVE / FINAL NOTE

ECHO system confirms: The next scheduled transmission was about to route the secondary bus beyond Meridian. We don't know the Ghost Carrier’s intent, but we know a regional relay would have reproduced it across the entire network.

ADRIAN'S LAST LOG: “I will cut the programme by hand. Keep the warning in the isolated archive. Do not restore the live carrier route. I can reach the secondary desk from the service corridor. Let them think I left.”

SYSTEM ECHO CONTAINMENT: Containment activated at 02:14:01. The remaining distribution buses have been violently disconnected.

WARNING TO RECOVERY TEAMS: Reconstruct the warning. Establish the sequence. Supply your recovered audio. Rebroadcasting the unidentified carrier is strictly forbidden. Containment was a decision made under total uncertainty. We still don't know where it came from.` },
  { id: "A", title: "The Red Ledger", classification: "Personnel · Evidence 01", body: `01:58 — Technician Mara Sen signs out.
02:07 — Adrian requests archive access.
02:12 — Adrian enters the internal service corridor.
02:14 — Security adds “host departed” in red ink.

INVESTIGATOR NOTE: The red ink is a lie—an assumption made after the incident. Nobody logged a vehicle leaving. Maintenance confirmed an interior latch was freshly oiled that same afternoon. He never left the facility.` },
  { id: "B", title: "The Silent Room", classification: "Facility schematic · Evidence", body: `THE TRUE ROUTE: Studio A → Archive Shelving → Service Corridor → Latch Z-0.

Z-0 has no exterior doors. It is a sealed box with independent ventilation.

CRITICAL CATCH: If you are comparing the badge logs to the security video, you must correct the time. Camera 3 time = Master Clock MINUS 19 seconds.

The public floor plan calls this space a “structural void”. It’s a blind spot.` },
  { id: "C", title: "The Vanishing Voice", classification: "Voice analysis · Evidence", body: `We ran audio recovery on the final static burst.

Fragment 1: “Don't trust the [carrier / courier].” Context confirms he is warning us about the signal: CARRIER.

Fragment 2: “I am cutting the [programme / power].” The mic kept recording after the output died, proving he cut the PROGRAMME, not the electrical power.

02:13:02 Transcript recovery: “If it goes out on the scheduled route, it will repeat beyond us.”

Do not confuse a voice disappearing from the public channel with a person leaving the building.` },
  { id: "D", title: "The Meridian Vector", classification: "Distribution routing · Evidence", body: `This was a viral path. The waypoints form a closed vector:

02:13 — Local Programme to Secondary Bus.
02:15 — Secondary Bus to Regional Relay.
02:16 — Regional Relay to External Repeaters.

Adrian entered a routing hold right before the regional slot. Whoever made that hold knew the broadcast was about to infect the outside world. The origin remains a ghost.` }
];
