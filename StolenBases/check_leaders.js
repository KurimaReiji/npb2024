import { createReadStream } from "fs";
import { NdJsonStream, get_players } from "../docs/js/utils.js";
import { readFileSync } from "fs";

const playerdb = Object.values(await get_players());
const infile = '../docs/runnerEvents.ndjson';
const readableStream = createReadStream(infile);
const { body } = new Response(readableStream);

const readable = body
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(new NdJsonStream())
  ;

const history = [];
for await (const cur of readable) {
  history.push(cur);
}

const today = process.argv.slice(2).at(0) || (new Date()).toISOString().slice(0, 10);
const curLeaders = `./leaders/${today}.json`;
const leaders = JSON.parse(readFileSync(curLeaders, "utf-8"));

leaders.map((league) => league.rows).flat().forEach((player) => {
  const catcher = playerdb.find((p) => p.jaRegisteredName === player.player).playerId;

  const data = history
    .filter((cur) => cur.date <= today)
    .filter((cur) => cur.catcher.playerId === catcher)
    .filter((cur) => cur.pickoff !== "Y")
    .reduce((acc, cur) => {
      acc[cur.scoring] += 1;
      if (cur.isDoubleSteal === "Y") acc["isDoubleSteal"] += 1;
      return acc;
    }, { StolenBase: 0, CaughtStealing: 0, isDoubleSteal: 0 })
    ;
  const rate = (data.CaughtStealing / (data.StolenBase + data.CaughtStealing - .5 * data.isDoubleSteal)).toFixed(3).replace(/^0/, "");

  if (player.value !== rate) {
    console.log(player.player, player.value, rate);
  }
});
