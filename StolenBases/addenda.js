import { readFileSync, existsSync, writeFileSync } from "fs";

const today = (new Date()).toISOString().slice(0, 10);
const arg = process.argv.slice(2);
const target = arg.length > 0 ? `${arg[0]}` : today;
const infile = `./daily/${target}.json`;
if (!existsSync(infile)) {
  process.exit();
}
const inputs = JSON.parse(readFileSync(infile, "utf-8"));
const data = inputs
  .map(({ jaText, text, pickoff, catcher, catchers }) => {
    if (catcher.playerId) {
      return {
        jaText, text, pickoff
      }
    }
    return {
      jaText, text, pickoff, catcher, catchers
    }
  })

const output = JSON.stringify(data, null, 2);
const outfile = `./addenda/${target}.json`;
if (!existsSync(outfile)) {
  writeFileSync(outfile, output);
}
//console.log(output);
