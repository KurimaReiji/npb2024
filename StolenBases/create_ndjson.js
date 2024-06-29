import { readFileSync, writeFileSync } from "fs";
import { readdir } from 'node:fs/promises';

const files = await readdir("daily");
const addenda = await readdir("addenda");
const ndjson = files
  .filter((fname) => fname.endsWith(".json"))
  .map((fname) => JSON.parse(readFileSync(`daily/${fname}`, "utf-8")))
  .filter((ary) => ary.length > 0)
  .map(merge)
  .flat()
  .map((obj) => JSON.stringify(obj))
  .join("\n");

writeFileSync("runnerEvents.ndjson", ndjson + "\n");

function merge(ary) {
  const addendum = addenda.find((fname) => fname === `${ary[0].date}.json`);
  if (addendum) {
    JSON.parse(readFileSync(`addenda/${addendum}`, "utf-8")).forEach((a, i) => {
      if (a.jaText === ary[i].jaText) {
        Object.assign(ary[i], a);
      } else {
        console.log(a.jaText);
        console.log(ary[i].jaText);
      }
    })
  }
  return ary
}