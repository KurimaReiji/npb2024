import { createReadStream, readFileSync, write, writeFile, writeFileSync } from "fs";
import { NdJsonStream } from "../docs/js/utils.js";
import { exit } from "process";

const teams = JSON.parse(readFileSync("../docs/npb2024-teams.json", "utf8"));
const teamCodes = teams.map(team => team.teamCode);
const teamNames = teamCodes.map(teamCode => teams.find(team => team.teamCode === teamCode).teamName);

const infile = "../docs/runnerEvents.ndjson";
const readableStream = createReadStream(infile);
const { body } = new Response(readableStream);
const data = [];
const readable = body
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(new NdJsonStream())
  ;

let updated = "";
for await (const cur of readable) {
  if (!cur.catcher.playerId) {
    exit();
  }
  data.push(cur);
  updated = cur.date;
}

const teamStats = teamCodes
  .map((teamCode) => {
    const teamName = teamNames[teamCodes.indexOf(teamCode)];
    const teamTotal = data.filter(({ catcher }) => catcher.teamCode === teamCode);
    const grpCatchers = [...new Set(teamTotal.map((o) => o.catcher.playerId))];
    const catchers = grpCatchers
      .map((playerId) => {
        return teamTotal.filter((o) => o.catcher.playerId === playerId);
      })
      .map((ary) => {
        const catcher = ary[0].catcher;
        const stats = get_stats(ary);
        return Object.assign({}, { catcher, stats });
      })
      .sort((a, b) => (b.stats.cs + b.stats.sb) - (a.stats.cs + a.stats.sb))
      ;
    return Object.assign({}, { teamCode, teamName, team: { stats: get_stats(teamTotal) }, catchers });
  })
  ;


const output = JSON.stringify({
  updated,
  teamStats,
  summary: get_summary(teamStats),
}, null, 2);

writeFileSync("../docs/StolenBases/catchers.json", output);

function get_stats(inputs) {
  const cs = inputs.filter((r) => !r.pickoff).filter(({ scoring }) => scoring === "CaughtStealing").length;
  const sb = inputs.filter((r) => !r.pickoff).filter(({ scoring }) => scoring === "StolenBase").length;
  const ds = .5 * inputs.filter(({ isDoubleSteal }) => isDoubleSteal).length;
  const rate = (cs + sb > 0) ? (cs / (cs + sb - ds)).toFixed(3).replace(/^0/, "") : "";
  const pickoff = inputs.filter(({ pickoff }) => pickoff);
  const pickoff_cs = pickoff.filter(({ scoring }) => scoring === "CaughtStealing").length;
  const pickoff_sb = pickoff.filter(({ scoring }) => scoring === "StolenBase").length;
  return { cs, sb, ds, rate, pickoff: { pickoff: pickoff.length, cs: pickoff_cs, sb: pickoff_sb } };
}

function get_summary(teamStats) {
  const npb = teamStats.map((o) => o.team.stats);
  const cl = npb.slice(0, 6);
  const pl = npb.slice(6);
  const stats = [npb, cl, pl]
    .map((ary) => {
      const d = ary.reduce((acc, cur) => ({
        cs: acc.cs + cur.cs,
        sb: acc.sb + cur.sb,
        ds: acc.ds + cur.ds,
      }), { cs: 0, sb: 0, ds: 0 });
      const ratio = (d.cs / (d.cs + d.sb - d.ds));
      const str = `${ratio.toLocaleString(undefined, { minimumFractionDigits: 1, style: 'percent' })} (${d.cs}/${d.cs + d.sb - d.ds})`;
      return { cs: d.cs, sb: d.sb, ds: d.ds, ratio: str };
    });
  return [
    { stats: stats[0], ja: "NPB", en: "NPB" },
    { stats: stats[1], ja: "セ・リーグ", en: "Central League" },
    { stats: stats[2], ja: "パ・リーグ", en: "Pacific League" },
  ];
}