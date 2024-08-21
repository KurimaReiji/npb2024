import { existsSync, readFileSync, writeFileSync } from "fs";

const infiles = process.argv.slice(2);
infiles
  .filter((infile) => existsSync(infile))
  .forEach((infile) => {
    const inputs = JSON.parse(readFileSync(infile, "utf-8"));
    const data = inputs
      .map((obj) => {
        const playerdb = obj.players;
        const meta = {
          date: obj.date,
          pathname: obj.pathname,
          venue: obj.venue,
          teams: obj.teams,
          catchers: {
            road: obj.battery.catchers.road.map((c) => playerdb.find((p) => p.playerId === c.id)),
            home: obj.battery.catchers.home.map((c) => playerdb.find((p) => p.playerId === c.id)),
          },
        };
        ["road", "home"].forEach((team) => {
          Object.assign(meta.teams[team], { score: obj.boxscore.teamStats[team].batting.runs });
        });
        return { meta, playByPlay: obj.playByPlay, playerdb };
      })
      .map(({ meta, playByPlay, playerdb }) => {
        const plays = playByPlay
          .map((p, i, a) => {
            if (p.isRunnerEvent) {
              Object.assign(p, { batter: who_at_plate(i, a) });
            }
            return p;
          })
          .filter((p) => p.isRunnerEvent)
        //.filter((p) => p.jaResult?.text.includes("盗塁")) || [];
        return { plays, meta, playerdb };
      })
      .filter(({ plays }) => plays.length > 0)
      .map(({ plays, meta, playerdb }) => {
        return plays.map((play) => {
          const tb = play.inning.halfInning === "top" ? "home" : "road";
          const catcher = meta.catchers[tb].length === 1 ? meta.catchers[tb][0] : {};
          return Object.assign({}, {
            date: "",
            runner: playerdb.find((p) => p.playerId === play.jaResult.players[0].id),
            batter: playerdb.find((p) => p.playerId === play.batter.id),
            pitcher: playerdb.find((p) => p.playerId === play.pitcher.id),
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
        if (sb.jaText.includes("牽制アウト")) {
          sb.scoring = "PickedOff";
          sb.pickoff = "Y";
        }
        return sb;
      })
      .map((sb) => {
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

function who_at_plate(idx, plays) {
  const prevPlay = plays.slice(idx - 1).filter(pp => pp.batter).at(0);
  const nextPlay = plays.slice(idx + 1).filter(pp => pp.batter).at(0);
  const curPlay = plays[idx];
  if (prevPlay.jaResult.text.includes("三振") && curPlay.outs === prevPlay.outs && curPlay.runners === prevPlay.runners) {
    return prevPlay.batter;
  } else {
    return nextPlay.batter;
  }
  // 前の打者が三振の場合、三振の投球で盗塁した可能性があり、その場合は前の打者が打席にいる。
  // 前の打者とアウトカウントが変化していれば、次の打者が打席にいる。
}
