import { existsSync, readFileSync } from "fs";

const infiles = process.argv.slice(2);
const data = infiles.filter((infile) => existsSync(infile))
  .map((infile) => JSON.parse(readFileSync(infile, "utf-8")))
  .flat()
  .flat()
  .map((o) => {
    const [home, road] = o.jaTitle.match(/(\S*?) vs (\S*?) /).slice(1, 3);
    return {
      date: o.date,
      url: `https://npb.jp${o.pathname}`,
      home,
      road,
      score: `${o.teamStats.home.runs} - ${o.teamStats.road.runs}`,
      place: o.venue.jaBoxscoreName,
      status: "試合終了",
    }
  });

const output = JSON.stringify(data, null, 2);
console.log(output);