# Players

公示情報をまとめたデータから、選手の名前などのデータベースを作成する。

- [支配下選手登録および登録抹消 | 2024 年度公示 | NPB.jp 日本野球機構](https://npb.jp/announcement/2024/#a1)

## 手順

公示情報から、支配下選手および育成選手の公示日、氏名、背番号などを収集し、公示日ごとに JSON にまとめる。これらを ndjson 形式（一行 JSON）にまとめ、時系列にデータを上書きしながら最新情報を JSON 形式のファイルにする。

- [rosterHistory.ndjson](https://kurimareiji.github.io/npb2024/rosterHistory.ndjson)
- [npb2024-players.json](https://kurimareiji.github.io/npb2024/npb2024-players.json)
