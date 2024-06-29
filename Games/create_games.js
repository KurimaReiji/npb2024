import { existsSync, readFileSync, writeFileSync } from "fs";

const teams = JSON.parse(readFileSync("../docs/npb2024-teams.json", "utf-8"));
const baystars = teams.find(({ teamName }) => teamName === "Baystars")
baystars.jaShortFranchiseName = "DeNA";
const toTeamName = (t) => teams.find(({ jaShortFranchiseName }) => jaShortFranchiseName === t).teamName;
const toTeamCode = (t) => teams.find(({ jaShortFranchiseName }) => jaShortFranchiseName === t).teamCode;

const venues = JSON.parse(readFileSync("../docs/npb2024-stadiums.json", "utf-8"));
// PayPay until 2024-04-21
// MIZUHO PayPay after 2024-04-27
const paypay = venues.find((v) => v.jaBoxscoreName === "PayPayドーム");
const mpay = structuredClone(paypay);
Object.assign(mpay, {
  jaBoxscoreName: "みずほPayPay",
  boxscoreName: "MIZUHO PayPay Dome",
  jaName: "みずほPayPayドーム福岡",
  name: "MIZUHO PayPay Dome FUKUOKA",
});
venues.push(mpay);

const dic = {
  "1塁": "1--",
  "2塁": "-2-",
  "3塁": "--3",
  "1・2塁": "12-",
  "1・3塁": "1-3",
  "2・3塁": "-23",
  "満塁": "123",
  "【試合終了】": "Final",
  "【雨天のためコールドゲーム】": "Completed Early",
  "【グラウンド不良のためコールドゲーム】": "Completed Early",
  "【雨天のため中止】": "Cancelled",
  "【台風接近のため中止】": "Cancelled",
};

const toDate = (jaDate) => jaDate.split(/[年月日]/).slice(0, 3).map((s) => s.padStart(2, "0")).join("-");

const parseGameInfo = (gameInfoStr) => {
  const gameInfo = gameInfoStr.replace(/(\d)時間 /, "$1時間0分 ").split(/\s{2,}/);
  return {
    status: dic[gameInfo[0]] || gameInfo[0],
    startTime: gameInfo[1].split(" ").at(-1),
    endTime: gameInfo[2].split(" ").at(-1),
    duration: gameInfo[3].match(/(\d+)時間(\d+)分/).slice(1, 3).map((s) => s.padStart(2, "0")).join(":"),
    attendanece: Number(gameInfo[4].match(/[\d,]+/)[0].replace(",", "")),
  }
}

const nxToNumber = (str) => {
  if (str.includes("x")) {
    if (str === "x") return 0;
    return Number(str.replace("x", ""));
  } else {
    return Number(str);
  }
}

const linescoreToString = (linescore) => {
  return linescore
    .map(({ team, tds }) => `${toTeamName(team).padStart(10)} | ${tds.slice(0, -3).map((n, i) => i % 3 === 2 ? n.padEnd(3) : n.padEnd(2)).join("")}| ${tds.at(-3)}`);
};

const linescoreToInnings = (linescore) => {
  return linescore[0].tds.slice(0, -3)
    .map((_, idx) => {
      const runs = [0, 1].map((i) => linescore[i].tds[idx]);
      return {
        num: idx + 1,
        home: {
          runs: nxToNumber(runs[1]),
        },
        road: {
          runs: nxToNumber(runs[0]),
        },
      };
    });
};

const linescoreToTeamStats = (linescoreInputs) => {
  return linescoreInputs.map(({ tds }) => {
    const [runs, hits, errors] = tds.slice(-3).map(nxToNumber);
    return {
      runs,
      hits,
      errors,
    }
  })
    .reverse()
    .reduce((a, c, i) => {
      a[i === 0 ? "home" : "road"] = c;
      return a;
    }, {});
};

const addPitcher = (obj, idx, ary) => {
  if (obj.hasOwnProperty("outs")) {
    obj.pitcher = ary.slice(0, idx)
      .findLast((o) => o.pitcher && o.inning.halfInning === obj.inning.halfInning)
      .pitcher;
  }
  return obj;
}

const count_runners = (rob) => {
  return rob.split("").filter((r) => r !== "-").length;
}

const addPlateAppearances = (linescore) => (obj, idx, ary) => {
  const isSkippable = [obj.isPitcherEvent, obj.isRunnerEvent, obj.isNoteEvent].some((s) => s === "Y");
  if (idx === 0) {
    Object.assign(obj, { pa: { top: 0, bottom: 0, inn: 0, runs: 0 } });
    return obj;
  }
  obj.pa = { ...ary[idx - 1].pa };
  if (obj.inning.halfInning !== ary[idx - 1].inning.halfInning) {
    Object.assign(obj.pa, { inn: 0, runs: 0 });
  }
  if (isSkippable) {
    //if (obj.inning.inning === 7) console.log(obj, isSkippable);
    return obj;
  }
  if (obj.inning.halfInning === "top") {
    Object.assign(obj.pa, { top: ary[idx - 1].pa.top + 1 });
  } else if (obj.inning.halfInning === "bottom") {
    Object.assign(obj.pa, { bottom: ary[idx - 1].pa.bottom + 1 });
  }
  obj.pa.inn = ({ ...obj.pa }).inn + 1;
  obj.pa.runs = obj.pa.inn - obj.outs - count_runners(obj.runners) - 1;
  return obj;
}

const addRuns = (linescore) => (obj, idx, ary) => {
  if (idx === 0) {
    Object.assign(obj, { runs: { road: 0, home: 0 } });
    return obj;
  }
  obj.runs = { ...ary[idx - 1].runs };

  const isSkippable = [obj.isPitcherEvent, obj.isRunnerEvent, obj.isNoteEvent].some((s) => s === "Y");
  if (isSkippable) return obj;
  const runs = obj.pa.inn - obj.outs - count_runners(obj.runners) - 1;
  if (obj.inning.halfInning === "top") {
    obj.runs.road = linescore[0].tds.slice(0, obj.inning.inning - 1).reduce((a, c) => a + nxToNumber(c), 0) + runs;
  } else if (obj.inning.halfInning === "bottom") {
    obj.runs.home = linescore[1].tds.slice(0, obj.inning.inning - 1).reduce((a, c) => a + nxToNumber(c), 0) + runs;
  }
  return obj;
}

const xaddRuns = (linescore) => (obj, idx, ary) => {
  if (idx === 0) {
    Object.assign(obj, { road: { runs: 0 }, home: { runs: 0 } });
    return obj;
  }
  obj.road = { ...ary[idx - 1].road };
  obj.home = { ...ary[idx - 1].home };

  const isSkippable = [obj.isPitcherEvent, obj.isRunnerEvent, obj.isNoteEvent].some((s) => s === "Y");
  if (isSkippable) return obj;
  const runs = obj.pa.inn - obj.outs - count_runners(obj.runners) - 1;
  if (obj.inning.halfInning === "top") {
    obj.road.runs = linescore[0].tds.slice(0, obj.inning.inning - 1).reduce((a, c) => a + nxToNumber(c), 0) + runs;
  } else if (obj.inning.halfInning === "bottom") {
    obj.home.runs = linescore[1].tds.slice(0, obj.inning.inning - 1).reduce((a, c) => a + nxToNumber(c), 0) + runs;
  }
  return obj;
}

const td2outs = (td) => Number(td.text.match(/[012]/)[0]);

const td2count = (td) => {
  if (td.text === "") return {};
  return td.text.replace("より", "").split("-")
    .map(Number).reduce((a, c, i) => {
      a[["balls", "strikes"][i]] = c;
      return a;
    }, {});
};

const td2runners = (td) => dic[td.text] || "---";

const td2batter = (td) => {
  return td.players[0];
};

const addInnngs = (item, idx, ary) => {
  if (item.length === 5) {
    const inning = ary.slice(0, idx).findLast((o) => o.inning);
    const isPinchHit = item[2].text.includes("代打") ? "Y" : undefined;
    return {
      inning,
      outs: td2outs(item[0]),
      runners: td2runners(item[1]),
      batter: td2batter(item[2]),
      count: td2count(item[3]),
      jaResult: item[4],
      isPinchHit,
      isRunnerEvent: item[4].text.includes("走者・") ? "Y" : undefined,
      isNoteEvent: item[4].text.includes("途中") ? "Y" : undefined,
    }
  } else if (item.length === 1) {
    const inning = ary.slice(0, idx).findLast((o) => o.inning);
    return {
      inning,
      pitcher: item[0].players.at(-1),
      jaText: item[0].text,
      home: { runs: 0 },
      road: { runs: 0 },
      isPitcherEvent: item[0].text.includes("投手") ? "Y" : undefined,

    }
  } else {
    return item;
  }
}

const toPlayByPlay = (inputs) => {
  const linescore = inputs["index.html"].linescore;
  return inputs["playbyplay.html"].playByPlay
    .map(addInnngs)
    .filter((o) => o.inning.hasOwnProperty("inning"))
    .map(addPitcher)
    .map(addPlateAppearances(linescore))
    .map(addRuns(linescore))
    .map((o) => {
      if (!o.hasOwnProperty("jaResult")) return o;
      if (o.jaResult.text.includes("打点")) {
        o.rbi = Number(o.jaResult.text.match(/打点([1234])/)?.[1]);
      }
      if (o.jaResult.text.match(/ヒット|ツーベース|スリーベース|ホームラン/)) {
        o.hits = 1;
      }
      if (o.jaResult.text.includes("エラー")) {
        o.errors = 1;
      }
      return o;
    })
    ;
}

const toTeamBoxStats = (box) => {
  return {
    road: {
      batting: box.road.batting.at(-1).slice(3, 8).map(o => Number(o.text)).reduce((a, c, i) => {
        a[["atBats", "runs", "hits", "rbi", "stolenBases"][i]] = c;
        return a;
      }, { atBats: 0, runs: 0, hits: 0, rbi: 0, stolenBases: 0 }),
      pitching: box.road.pitching.at(-1).slice(2).map(o => Number(o.text)).reduce((a, c, i) => {
        a[["pitchesThrown", "battersFaced", "inningsPitched", "hits", "homeRuns", "baseOnBalls", "hitByPitch", "strikeOuts", "wildPitches", "balks", "runs", "earnedRuns"][i]] = c;
        return a;
      }, {
        pitchesThrown: 0, battersFaced: 0, inningsPitched: 0, hits: 0, homeRuns: 0, baseOnBalls: 0, hitByPitch: 0, strikeOuts: 0,
        wildPitches: 0, balks: 0, runs: 0, earnedRuns: 0
      })
    },
    home: {
      batting: box.home.batting.at(-1).slice(3, 8).map(o => Number(o.text)).reduce((a, c, i) => {
        a[["atBats", "runs", "hits", "rbi", "stolenBases"][i]] = c;
        return a;
      }, { atBats: 0, runs: 0, hits: 0, rbi: 0, stolenBases: 0 }),
      pitching: box.home.pitching.at(-1).slice(2).map(o => Number(o.text)).reduce((a, c, i) => {
        a[["pitchesThrown", "battersFaced", "inningsPitched", "hits", "homeRuns", "baseOnBalls", "hitByPitch", "strikeOuts", "wildPitches", "balks", "runs", "earnedRuns"][i]] = c;
        return a;
      }, {
        pitchesThrown: 0, battersFaced: 0, inningsPitched: 0, hits: 0, homeRuns: 0, baseOnBalls: 0, hitByPitch: 0, strikeOuts: 0,
        wildPitches: 0, balks: 0, runs: 0, earnedRuns: 0
      }),
    }
  }
}

const getPitchers = (battery) => {
  const players = battery.map((ary) => ary[1].players);
  return {
    road: battery[0][1].text.split("　‐　").at(0).split("、").map((s) => players[0].find((p) => p.jaBoxscoreName === s)),
    home: battery[1][1].text.split("　‐　").at(0).split("、").map((s) => players[1].find((p) => p.jaBoxscoreName === s)),
  }
}

const getCatchers = (battery) => {
  const players = battery.map((ary) => ary[1].players);
  return {
    road: battery[0][1].text.split("　‐　").at(-1).split("、").map((s) => players[0].find((p) => p.jaBoxscoreName === s)),
    home: battery[1][1].text.split("　‐　").at(-1).split("、").map((s) => players[1].find((p) => p.jaBoxscoreName === s)),
  }
}

const getHomeruns = (homeruns) => {
  return homeruns.map((hrs, topbot) => {
    if (hrs[1] === "") return [];
    return hrs[1].text.split("、").map((hr, i) => {
      const [bat, number, inning, rbi, pit] = hr.match(/(.*) (\d+)号（(\d+)回(.*) (.*)）/).slice(1);
      const batter = hrs[1].players[i * 2];
      const pitcher = hrs[1].players[i * 2 + 1];
      return {
        id: [batter.id, "2024", `${number}`.padStart(2, "0")].join("-"),
        inning: Number(inning),
        "halfInning": ["top", "bottom"][topbot],
        rbi: ["", "ソロ", "2ラン", "3ラン", "満塁"].indexOf(rbi),
        number: Number(number),
        batter,
        pitcher,
      }
    })
  })
    .reduce((a, c, i) => {
      a[i === 0 ? "road" : "home"] = c;
      return a;
    }, { road: [], home: [] });
}

const infiles = process.argv.slice(2);
infiles
  .filter((infile) => existsSync(infile))
  .forEach((infile) => {
    const inputs = JSON.parse(readFileSync(infile, "utf-8"));
    const data = inputs
      .map((objs) => {
        const obj = objs["index.html"];
        const box = objs["box.html"];
        const date = toDate(obj.date);
        const { status, startTime, endTime, duration, attendanece } = parseGameInfo(obj.gameInfo);
        const venue = venues.find((v) => v.jaBoxscoreName === obj.place.replace(/　/g, ""));

        return {
          date,
          pathname: obj.pathname.replace("index.html", ""),
          jaTitle: obj.title.replace(/\s{2,}/g, " "),
          teams: {
            road: { teamCode: toTeamCode(obj.linescore[0].team), teamName: toTeamName(obj.linescore[0].team) },
            home: { teamCode: toTeamCode(obj.linescore[1].team), teamName: toTeamName(obj.linescore[1].team) },
          },
          status,
          venue: {
            jaBoxscoreName: venue.jaBoxscoreName,
            boxscoreName: venue.boxscoreName,
            jaName: venue.jaName,
            name: venue.name,
          },
          startTime,
          endTime,
          duration,
          attendanece,
          umpires: { jaText: obj.umpires },
          battery: {
            pitchers: getPitchers(obj.battery),
            catchers: getCatchers(obj.battery),
          },
          homeruns: getHomeruns(obj.homeruns),
          boxscore: { teamStats: toTeamBoxStats(box) },
          playByPlay: toPlayByPlay(objs),
          linescore: linescoreToString(obj.linescore),
          teamStats: linescoreToTeamStats(obj.linescore),

          innings: linescoreToInnings(obj.linescore),
        }
      })
      ;
    const output = JSON.stringify(data, null, 2);
    const date = infile.match(/2024-\d+-\d+/)[0];
    const outfile = `./daily/${date}.json`;
    console.log(outfile);
    writeFileSync(outfile, output);

    checker(data);
  });

// decisions, box, hits by inning

function checker(games) {
  games.forEach((game) => {
    // batting.plateAppearances === pitching.battersFaced
    const { top, bottom } = game.playByPlay.at(-1).pa;
    if (game.boxscore.teamStats.home.pitching.battersFaced !== top || game.boxscore.teamStats.road.pitching.battersFaced !== bottom) {
      console.log(game.date, game.playByPlay.at(-1), top);
    }
  });
}
