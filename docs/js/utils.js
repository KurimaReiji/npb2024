/**
 * compare function to sort by winning percentage
 * @param {object} a
 * @param {object} b
 * @returns
 */
const teams_by_wpct = (a, b) => {
  const [aWpct, bWpct] = [a, b].map((obj) => obj.wins / (obj.wins + obj.losses));
  if (aWpct > bWpct) return -1;
  if (aWpct < bWpct) return 1;
  if (a.wins > b.wins) return -1;
  if (a.wins < b.wins) return 1;
  return 0;
};

/**
 * returns truncated winning percentage. e.g. 0.333, 0.5, 0.667
 * @param {number} win
 * @param {number} loss
 * @returns {number}
 */
const winpct = (win, loss) => {
  const val = (1000 * win) / (win + loss);
  return Math.trunc(Math.round(val)) / 1000;
};

/**
 * calculate games behind from the leader
 * @param {number} win
 * @param {number} loss
 * @param {number} leaderWin
 * @param {number} leaderLoss
 * @returns {number}
 */
const games_behind = (win, loss, leaderWin, leaderLoss) => {
  if (win === leaderWin && loss === leaderLoss) return "";
  return ((leaderWin - win + (loss - leaderLoss)) * 0.5).toFixed(1);
};

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

/**
 * @typedef {{playerId: string, boxscoreName: string}} Player
 */
/**
 * Returns NPB Players
 * @param {string} date
 * @returns {Promise<Object>} Promise object represents the hash of players
 */
const get_players = async (date = "2024-03-29") => {
  const ndjson = "https://kurimareiji.github.io/npb2024/rosterHistory.ndjson";
  const response = await fetch(ndjson, { mode: 'cors' });
  const { body } = response;
  const readable = body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new NdJsonStream())
    ;
  const players = {};
  for await (const cur of readable) {
    if (cur.date > date) break;
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
  return players;
}

async function get_venues(date = "2024-03-29") {
  const ndjson = "https://kurimareiji.github.io/npb2024/npb2024-venues.ndjson";
  const response = await fetch(ndjson, { mode: 'cors' });
  const { body } = response;
  const readable = body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new NdJsonStream())
    ;
  const venues = {};
  for await (const cur of readable) {
    if (cur.date > date) continue;
    const venue = venues[cur.venueId] || Object.assign({}, { ...cur }, {
      date: undefined,
      newValue: undefined,
    },
    );

    Object.assign(venue, { ...cur.newValue });
    venues[venue.venueId] = venue;
  }
  return Object.values(venues);
}

/**
 * reducer to uniq
 * @param {*} acc
 * @param {*} cur
 * @param {*} idx
 * @param {*} ary
 * @returns
 */
const to_uniq = (acc, cur, idx, ary) => {
  if (idx === ary.length - 1) acc = [...new Set(ary)];
  return acc;
};

const Pythagorean = (rs, ra, exp = 1.83) => {
  // The initial formula for pythagorean winning percentage was as follows: (runs scored ^ 2) / [(runs scored ^ 2) + (runs allowed ^ 2)]
  // Baseball-Reference.com, for instance, uses 1.83 as its exponent of choice 
  return rs ** exp / (rs ** exp + ra ** exp);
};

const get_xwl = (win, loss, rs, ra) => {
  const wpct = Pythagorean(Number(rs), Number(ra));
  const xWin = (Number(win) + Number(loss)) * wpct;
  const xLoss = (Number(win) + Number(loss)) * (1 - wpct);
  return {
    wins: Math.round(xWin),
    losses: Math.round(xLoss),
    luck: win - Math.round(xWin),
  };
};

export {
  teams_by_wpct,
  winpct,
  games_behind,
  NdJsonStream,
  get_players,
  get_venues,
  to_uniq,
  get_xwl,
}