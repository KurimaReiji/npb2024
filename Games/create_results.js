import { readFileSync } from "fs";

const infiles = process.argv.slice(2);

const inputs = infiles.map((infile) => JSON.parse(readFileSync(infile, "utf-8")));

const data = inputs
  .flat()
  .map((o) => {
    const starter = Object.fromEntries(
      ["road", "home"]
        .map((rh) => [rh, o.battery.pitchers[rh].at(0).id])
        .map(([rh, id]) => {
          const pitcher = o.players.find((player) => player.playerId === id);
          return [rh, pitcher];
        })
    );
    // VS. R: Record vs. Right-handed Starting Pitchers
    // console.log(["road", "home"].map((h) => o.battery.pitchers[h].at(0)))
    return {
      date: o.date,
      endTime: o.endTime,
      road: { team: o.teams.road.teamName, runs: o.teamStats.road.runs, starter: starter.road.pitchHand },
      home: { team: o.teams.home.teamName, runs: o.teamStats.home.runs, starter: starter.home.pitchHand },
    }
  })
  .sort((a, b) => {
    const [aa, bb] = [a, b].map(({ date, endTime }) => `${date} ${endTime}`);
    if (aa < bb) return -1;
    if (aa > bb) return 1;
    return 0;
  })
  ;

const ndjson = data.map((d) => JSON.stringify(d)).join("\n");

console.log(ndjson);