TODAY := $(shell TZ=UTC date --rfc-3339=date)

npb2024-results.ndjson: daily/$(TODAY).json
	node create_results.js daily/*.json > ../docs/npb2024-results.ndjson

daily/$(TODAY).json: 
	node create_games.js ../scraped/daily/$(TODAY).json
