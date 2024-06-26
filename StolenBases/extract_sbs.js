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
          teams: obj.teams,
          catchers: obj.battery.catchers,
        };
        ["road", "home"].forEach((team) => {
          Object.assign(meta.teams[team], { score: obj.boxscore.teamStats[team].batting.runs });
        });
        return { meta, playByPlay: obj.playByPlay };
      })
      .map(({ meta, playByPlay }) => {
        const plays = playByPlay
          .map((p, i, a) => {
            if (p.isRunnerEvent) {
              Object.assign(p, { batter: a.slice(i + 1).filter(pp => pp.batter).at(0).batter })
            }
            return p;
          })
          .filter((p) => p.isRunnerEvent)
        //.filter((p) => p.jaResult?.text.includes("盗塁")) || [];
        return { plays, meta };
      })
      .map(({ plays, meta }) => {
        //console.log(plays)
        return { plays, meta };
      })
      .filter(({ plays }) => plays.length > 0)
      .map(({ plays, meta }) => {
        return plays.map((play) => {
          const tb = play.inning.halfInning === "top" ? "home" : "road";
          const catcher = meta.catchers[tb].length === 1 ? meta.catchers[tb][0] : {};
          return Object.assign({}, {
            date: "",
            runner: play.jaResult.players[0],
            batter: play.batter,
            pitcher: play.pitcher,
            catcher,
            scoring: "",
            base: "",
            "isDoubleSteal": play.jaResult.text.includes("ダブルスチール") ? "Y" : undefined,
            "pickoff": "",
            inning: play.inning.inning,
            halfInning: play.inning.halfInning,
            outs: play.outs,
            RoB: play.runners,
            runs: play.runs,
            venue: {},
            teams: {},
            jaText: play.jaResult.text,
            text: "",
            url: "",
          }, meta);
        })
      })
      .flat()
      .map((sb) => {
        const runner = playerdb.find((p) => p.playerId === sb.runner.id);
        const pitcher = playerdb.find((p) => p.playerId === sb.pitcher.id);
        const batter = playerdb.find((p) => p.playerId === sb.batter.id);

        Object.assign(sb.runner, {
          boxscoreName: runner.boxscoreName,
        });
        Object.assign(sb.batter, {
          boxscoreName: batter.boxscoreName,
          batSide: batter.batSide,
        });
        Object.assign(sb.pitcher, {
          boxscoreName: pitcher.boxscoreName,
          pitchHand: pitcher.pitchHand,
        });
        return sb;
      })
      .map((sb) => {
        const url = `https://npb.jp${sb.pathname}playbyplay.html#com${sb.inning}-${sb.halfInning === "top" ? 1 : 2}`;
        delete sb.pathname;
        return Object.assign({}, sb, { url }, {
          text: get_en_text(sb),
        });
      })
      .map((sb) => {
        if (sb.jaText.includes("盗塁成功")) sb.scoring = "StolenBase";
        if (sb.jaText.includes("盗塁失敗")) sb.scoring = "CaughtStealing";
        if (sb.jaText.includes("牽制アウト")) sb.scoring = "PickedOff";
        return sb;
      })
      .map((sb) => {
        if (sb.catcher.id) {
          const catcher = playerdb.find((p) => p.playerId === sb.catcher.id);
          Object.assign(sb.catcher, {
            boxscoreName: catcher.boxscoreName,
          });
        }
        ["home", "road"].forEach((t) => {
          sb.catchers[t].forEach((c) => {
            const catcher = playerdb.find((p) => p.playerId === c.id);
            Object.assign(c, {
              boxscoreName: catcher.boxscoreName,
            });
          })
        });
        if (sb.halfInning === "top") sb.catchers = sb.catchers.home;
        if (sb.halfInning === "bottom") sb.catchers = sb.catchers.road;
        return sb;
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

function get_en_text(sb) {
  const dic = {
    "一塁": "1st base",
    "二塁": "2nd base",
    "三塁": "3rd base",
    "本塁": "home plate",
    "1st base": "1B",
    "2nd base": "2B",
    "3rd base": "3B",
    "home plate": "HP",
  };
  const m = sb.jaText.match(/(.塁)(盗塁|牽制)(成功|失敗|アウト)/);
  sb.base = dic[dic[m[1]]];
  if (m[3] === "成功") {
    return `${sb.runner.boxscoreName || sb.runner.id} steals ${dic[m[1]]}.`;
  } else if (m[3] === "失敗") {
    return `${sb.runner.boxscoreName || sb.runner.id} caught stealing ${dic[m[1]]}.`;
  } else if (m[3] === "アウト") {
    return `${sb.runner.boxscoreName || sb.runner.id} picked off at ${dic[m[1]]}.`;
    // Pitcher picks off runner at on throw to 1st base.
    // Shohei picked off and caught stealing 3rd base.
  }
}

// key order
