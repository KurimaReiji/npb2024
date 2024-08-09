import { readFileSync } from "fs";

const infile = "../docs/standings.json";
const inputs = JSON.parse(readFileSync(infile, "utf-8"));
const [cl, pl] = inputs
  .map((league) => league.teamRecords.map(formatRecord))
  ;

const title = "Split by Starter's Pitch Hand";
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

function formatRecord({ teamName, pct, overall: { wins, losses, ties, gamesBack, splitRecords } }) {
  const vsr = splitRecords.find((r) => r.type === "right");
  const vsl = splitRecords.find((r) => r.type === "left");
  return [
    teamName.padEnd(9),
    `${wins}`.padStart(2),
    `${losses}`.padStart(2),
    `${ties}`.padStart(2),
    `${pct}`.padStart(5),
    `${gamesBack}`.padStart(4),
    " ",
    [
      `${vsr.wins}`.padStart(2),
      `${vsr.losses}`.padEnd(3)
    ].join("-"),
    [
      `${vsl.wins}`.padStart(2),
      `${vsl.losses}`.padEnd(2)
    ].join("-"),
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
    "VS. R".padStart(5),
    "",
    "VS. L".padStart(5),
  ].join(" ");
}