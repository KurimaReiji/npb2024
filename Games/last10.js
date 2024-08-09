import { readFileSync } from "fs";

const infile = '../docs/standings.json';

const inputs = JSON.parse(readFileSync(infile, "utf-8"));
const [cl, pl] = inputs
  .map((league) => league.teamRecords.map(formatRecord))
  ;

const title = "Record in the Last 10 Games";
const n = cl.at(0).length;

const output = [
  `${" ".repeat(.5 * (n - title.length))}${title}`,
  "=".repeat(n),
  cl.join("\n"),
  "-".repeat(n),
  pl.join("\n")
].join("\n");

console.log(output);

function formatRecord({ teamName, overall: { streak, last10, wlt } }) {
  return [
    teamName.padEnd(9),
    [`${last10.wins}`.padStart(2), `${last10.losses}`.padEnd(2)].join("-"),
    wlt.slice(-10).padEnd(11),
    streak.padEnd(3),
  ].join(" ");
}
