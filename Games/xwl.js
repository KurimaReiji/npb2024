import { readFileSync } from "fs";

const infile = "../docs/standings.json";
const inputs = JSON.parse(readFileSync(infile, "utf-8"));
const [cl, pl] = inputs
  .map((league) => league.teamRecords.map(formatRecord))
  ;

const title = "2024 NPB Standings";
const n = cl[0].length;

const output = [
  `${" ".repeat(.5 * (n - title.length))}${title}`,
  "=".repeat(n),
  header(),
  "-".repeat(n),
  cl.join("\n"),
  "-".repeat(n),
  pl.join("\n"),
  "-".repeat(n),
].join("\n");

console.log(output);

function formatRecord({ teamName, pct, overall: { gamesPlayed, wins, losses, ties, runsScored, runsAllowed, gamesBack, splitRecords } }) {
  const xwl = splitRecords.find((r) => r.type === "xWinLoss");
  return [
    teamName.padEnd(9),
    `${wins}`.padStart(2),
    `${losses}`.padStart(2),
    `${ties}`.padStart(2),
    `${pct}`.padStart(5),
    `${gamesBack}`.padStart(4),
    " ",
    (runsScored / gamesPlayed).toFixed(2),
    (runsAllowed / gamesPlayed).toFixed(2),
    " ",
    [
      `${xwl.wins}`.padStart(2),
      `${xwl.losses}`.padEnd(2)
    ].join("-"),
    `${xwl.luck}`.padStart(4),
  ].join(" ");
}

function header() {
  return [
    "Team".padEnd(9),
    "W".padStart(2),
    "L".padStart(2),
    "T".padStart(2),
    "PCT".padStart(5),
    "GB".padStart(4),
    " ",
    "RS/G".padStart(4),
    "RA/G".padStart(4),
    " ",
    "X-W/L".padStart(5),
    "Luck".padStart(4),
  ].join(" ");
}