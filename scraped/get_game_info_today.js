import { writeFileSync } from "fs";
import { exit } from "process";
import puppeteer from 'puppeteer';

const to_uniq = (acc, cur, idx, ary) => {
  if (idx == ary.length - 1) acc = [...new Set(ary)];
  return acc;
};

const get_linescore_urls = (date) => {
  const scheduled = [...document.querySelectorAll("#header_score .state")]
    .filter((div) => !/[cpew]l-/.test(div.closest("a").href));
  const inProgress = scheduled
    .filter(el => el.textContent.includes("回"));

  const urls = scheduled
    .filter(el => el.textContent.includes("試合終了"))
    .map(el => el.closest("a").href)
    ;
  return [{
    date, urls, inProgress: inProgress.length > 0
  }]
}

const scrapers = {
  "index.html": () => {
    const anchor2player = (anchor) => {
      return {
        id: anchor.href.match(/\d{6,}/)[0],
        jaBoxscoreName: anchor.textContent,
      };
    };

    const gameInfo = document.querySelector(".game_info").textContent.trim();

    const [date, place, title] = ["time", ".place", "h3"]
      .map(q => document.querySelector(`.game_tit ${q}`).textContent.trim());

    const linescore = ["top", "bottom"]
      .map(klass => document.querySelector(`tr.${klass}`))
      .map(tr => {
        return {
          team: tr.querySelector(".hide_pc").textContent,
          tds: [...tr.querySelectorAll("td")]
            .map(td => td.textContent.trim()),
        }
      });

    const umpires = document.querySelector(".referee_info").textContent.trim().replace(/\s+/g, " ");

    const decisions = [...document.querySelectorAll(".game_result_info table:nth-of-type(1) tr")]
      .map((tr) => [...tr.querySelectorAll("th,td")]
        .map((td) => {
          const anchor = td.querySelector("a");
          if (anchor) {
            return {
              players: [...td.querySelectorAll("a")].map(anchor2player),
              text: td.textContent.trim(),
            }
          }
          return td.textContent.trim();
        }))
      ;

    const battery = [...document.querySelectorAll(".game_result_info table:nth-of-type(2) tr")]
      .map((tr) => [...tr.querySelectorAll("th,td")]
        .map((td) => {
          const anchor = td.querySelector("a");
          if (anchor) {
            return {
              players: [...td.querySelectorAll("a")].map(anchor2player),
              text: td.textContent.trim(),
            }
          }
          return td.textContent.trim();
        }))
      ;

    const homeruns = [...document.querySelectorAll(".game_result_info table:nth-of-type(3) tr")]
      .map((tr) => [...tr.querySelectorAll("th,td")]
        .map((td) => {
          const anchor = td.querySelector("a");
          if (anchor) {
            return {
              players: [...td.querySelectorAll("a")].map(anchor2player),
              text: td.textContent.trim(),
            }
          }
          return td.textContent.trim();
        }))
      ;

    return {
      pathname: location.pathname,
      date, place, title, gameInfo, linescore,
      umpires, decisions, battery, homeruns,
    };
  },
  "playbyplay.html": () => {
    const anchor2player = (anchor) => {
      return {
        id: anchor.href.match(/\d{6,}/)[0],
        jaBoxscoreName: anchor.textContent,
      };
    };

    const h52obj = (h5) => {
      const [inning, topOrBottom] = h5.textContent.split(/回|（/);
      const dic = { "表": "top", "裏": "bottom" };
      return {
        inning: Number(inning),
        halfInning: dic[topOrBottom],
        text: h5.textContent,
      };
    };

    const td2players = (td) => [...td.querySelectorAll("a")].map(anchor2player);

    const td2obj = (td) => {
      return {
        players: td2players(td),
        text: td.textContent.trim(),
      }
    };

    const tr2obj = (tr) => {
      const tds = [...tr.querySelectorAll("td")].map(td2obj);
      if (tds.length === 0) return h52obj(tr);
      return tds;
    };

    const playByPlay = [...document.getElementById("progress").querySelectorAll("h5,tr")]
      .filter((tr) => !tr.querySelector("th"))
      .map(tr2obj)
      ;

    return {
      pathname: location.pathname,
      playByPlay,
    };
  },
  "box.html": () => {
    const anchor2player = (anchor) => {
      return {
        id: anchor.href.match(/\d{6,}/)[0],
        jaBoxscoreName: anchor.textContent,
      };
    };

    const td2obj = (td) => {
      const anchor = td.querySelector('a');
      if (anchor) return anchor2player(anchor);
      return {
        cls: [...td.classList],
        text: td.textContent.trim().replace(/\s+/g, ''),
      }
    }

    const teams = [...document.querySelectorAll("h4")].map(h4 => h4.textContent.trim());

    const tables = [...document.querySelectorAll('.table_score')]
      .map((tbl) => {
        return [...tbl.querySelectorAll('tr')]
          .filter(tr => !tr.closest('.table_inning'))
          .map(tr => [...tr.querySelectorAll("th,td")]
            .filter(td => !td.closest('.table_inning'))
            .map(td2obj))
      });

    return {
      pathname: location.pathname,
      road: { team: teams[0], batting: tables[0], pitching: tables[1] },
      home: { team: teams[1], batting: tables[2], pitching: tables[3] },
    }
  },
}

const dates = [(new Date()).toISOString().slice(0, 10)];


const browser = await puppeteer.launch({
  defaultViewport: {
    width: 1200,
    height: 1100,
  },
  headless: "new",
});

const year = dates[0].slice(0, 4);

const page = await browser.newPage();
await page.goto(`https://npb.jp/`);
await page.waitForSelector(`#footer_team`, { timeout: 9000 });
const obj = await page.evaluate(get_linescore_urls, dates[0]);
console.log(obj);
if (obj[0].inProgress) {
  console.log("in progress");
  await browser.close();
  exit();
}

const targets = ["index.html", "playbyplay.html", "box.html"];

for (const { date, urls } of obj) {
  const outfile = `./${date}.json`;
  const outputs = [];
  for (const url of urls) {
    const data = {};
    for (const target of targets) {
      await page.goto(`${url}${target}`);
      await page.waitForSelector(`.game_info`, { timeout: 9000 });
      console.log(`${url}${target}`);
      data[target] = await page.evaluate(scrapers[target]);
    }
    outputs.push(data);
  }
  const output = JSON.stringify(outputs, null, 2);
  console.log(`output: ${outfile}`);
  writeFileSync(outfile, output, "utf8");
}

await browser.close();
