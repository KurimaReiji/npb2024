import { createReadStream } from "fs";

const infile = '../docs/rosterHistory.ndjson';
const readableStream = createReadStream(infile);
const { body } = new Response(readableStream);

class NdJsonStream extends TransformStream {
  constructor() {
    super({
      transform(chunk, controller) {
        const lines = `${this._remainder || ""}${chunk}`.split(/\r?\n/);
        this._remainder = lines.pop();
        JSON.parse(`[${lines.join(",")}]`).forEach((item) => {
          controller.enqueue(item);
        });
      }
    });
  }
}

const readable = body
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(new NdJsonStream())
  ;

const players = {};

for await (const cur of readable) {

  const player = players[cur.playerId] || Object.assign({}, { ...cur }, {
    date: undefined,
    jaEvent: undefined,
    jaEventDetails: undefined,
    newValue: undefined,
  },
  );

  Object.assign(player, { ...cur.newValue });
  players[player.playerId] = player;
}

const teamCodes = ["T", "C", "DB", "G", "S", "D", "B", "M", "H", "E", "L", "F", ""];

const data = Object.values(players)
  .sort((a, b) => {
    const [aa, bb] = [a, b].map((o) => {
      const teamIdx = `${teamCodes.findIndex(c => c === o.teamCode)}`.padStart(2, "0");
      const num = o.primaryNumber.padStart(4, "0");
      return `${teamIdx}${num}`;
    })
    if (aa < bb) return -1;
    if (aa > bb) return 1;
    return 0;
  })
  ;

const output = JSON.stringify(data, null, 2);
console.log(output);
