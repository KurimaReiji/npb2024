import { writeFileSync } from "fs";
import puppeteer from 'puppeteer';

const scraper = () => {
  const headings = [...document.querySelectorAll("#stdivtitle h1, #stdivtitle h2, .stleadbmn h3")].map(h => h.textContent.trim());
  const updated = document.querySelector("#stupdate").textContent.trim().split(/[■ 年月日]/).slice(2, 5).map(s => s.padStart(2, "0")).join("-");
  const tbl = document.querySelector("#stdivmaintbl table table");
  const rows = [...tbl.querySelectorAll("tr:has(.stplayer)")].map(tr => [...tr.querySelectorAll("td")]).map(tds => tds.slice(1).map(td => td.textContent.trim()));
  return {
    headings,
    updated: updated.includes("2024") ? updated : "Final",
    rows: rows.map(s => ({ player: s[0], team: s[1].replace(/[（）]/g, ""), value: s[2] }))
  };
};

const browser = await puppeteer.launch({
  defaultViewport: {
    width: 1200,
    height: 1100,
  },
  headless: "new",
});

const targets = [
  "https://npb.jp/bis/2024/stats/lf_csp2_c.html",
  "https://npb.jp/bis/2024/stats/lf_csp2_p.html"
];

const page = await browser.newPage();
const outputs = [];

for (const target of targets) {
  await page.goto(target);
  await page.waitForSelector(`.stplayer`, { timeout: 10000 });
  const data = await page.evaluate(scraper);
  outputs.push(data);
}
const date = outputs[1].updated;
const outfile = `./${date}.json`;
console.log(`output: ${outfile}`);
const output = JSON.stringify(outputs, null, 2);
writeFileSync(outfile, output, "utf8");

await browser.close();
