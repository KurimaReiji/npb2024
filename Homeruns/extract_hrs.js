import { existsSync, readFileSync, writeFileSync } from "fs";

const playerdb = JSON.parse(readFileSync("../docs/npb2024-players.json", "utf-8"));

const infiles = process.argv.slice(2);
infiles
  .filter((infile) => existsSync(infile))
  .forEach((infile) => {
    const inputs = JSON.parse(readFileSync(infile, "utf-8"));
    const data = inputs
      .map((obj) => {
        const meta = {
          date: obj.date,
          pathname: obj.pathname,
          venue: obj.venue,
          teams: obj.teams
        };
        ["road", "home"].forEach((team) => {
          Object.assign(meta.teams[team], { score: obj.boxscore.teamStats[team].batting.runs });
        });
        const homeruns = [obj.homeruns.road, obj.homeruns.home].flat().map((hr) => Object.assign({}, hr, meta));
        return { homeruns, playByPlay: obj.playByPlay };
      })
      .map(({ homeruns, playByPlay }) => {
        return homeruns.map((hr) => {
          const play = playByPlay.find((p) => p.jaResult?.text.includes("ホームラン") && p.batter.id === hr.batter.id && p.inning.inning === hr.inning && p.inning.halfInning === hr.halfInning); // never multi hr in a inning
          let isWalkOff;
          if (hr.halfInning === "bottom" && hr.inning > 8 && play.runs.road < (play.runs.home + hr.rbi)) {
            isWalkOff = "Y";
          }
          return Object.assign({}, hr, {
            bop: play.pa[hr.halfInning] % 9 || 9,
            outs: play.outs,
            RoB: play.runners,
            count: play.count,
            runs: play.runs,
            jaText: play.jaResult.text,
            isLeadOff: play.pa[hr.halfInning] === 1 ? "Y" : undefined,
            isWalkOff,
            isPinchHit: play.isPinchHit,
          });
        });
      })
      .flat()
      .map((hr) => {
        const batter = playerdb.find((p) => p.playerId === hr.batter.id);
        const pitcher = playerdb.find((p) => p.playerId === hr.pitcher.id);
        Object.assign(hr.batter, {
          boxscoreName: batter.boxscoreName,
          batSide: batter.batSide,
        });
        Object.assign(hr.pitcher, {
          boxscoreName: pitcher.boxscoreName,
          pitchHand: pitcher.pitchHand,
        });
        return hr;
      })
      .map((hr) => {
        const whereHit = get_where(hr.jaText);
        const url = `https://npb.jp${hr.pathname}playbyplay.html#com${hr.inning}-${hr.halfInning === "top" ? 1 : 2}`;
        delete hr.pathname;
        Object.assign(hr, { whereHit });
        return Object.assign(hr, { text: get_en_text(hr), url });
      })
      .map((hr) => {
        return Object.assign({
          id: "",
          date: "",
          batter: {},
          pitcher: {},
          number: -1,
          inning: -1,
          halfInning: "",
          outs: -1,
          "RoB": "",
          count: {},
          runs: {},
          bop: -1,
          rbi: -1,
          whereHit: "",
          venue: {},
          teams: {},
          jaText: "",
          text: "",
          url: "",
        }, hr);
      })
      ;

    const output = JSON.stringify(data, null, 2);
    const date = infile.match(/2024-\d+-\d+/)[0];
    const outfile = `./daily/${date}.json`;
    console.log(outfile);
    //console.log(output);
    writeFileSync(outfile, output);
  })
  ;

function get_where(jaText) {
  const dic = {
    "レフト": "7",
    "ライト": "9",
    "センター": "8",
    "左中間": "78",
    "右中間": "89",
    "NA": "NA",
  };
  const whereHit = jaText.match(/(レフト|ライト|センター|左中間|右中間)/)?.at(1) || "NA";
  return dic[whereHit];
}

function get_en_text(hr) {
  const dic = {
    "7": " to left field",
    "8": " to center field",
    "9": " to right field",
    "78": " to left center",
    "89": " to right center",
  };
  return `${hr.batter.boxscoreName || hr.batter.id} homers (${hr.number})${dic[hr.whereHit]}.`;
}

// key order
