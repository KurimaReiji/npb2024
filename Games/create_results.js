import { readFileSync } from "fs";

const infiles = process.argv.slice(2);

const inputs = infiles.map((infile) => JSON.parse(readFileSync(infile, "utf-8")));

const data = inputs
  .flat()
  .map((o) => {
    return {
      date: o.date,
      endTime: o.endTime,
      road: { team: o.teams.road.teamName, runs: o.teamStats.road.runs },
      home: { team: o.teams.home.teamName, runs: o.teamStats.home.runs },
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