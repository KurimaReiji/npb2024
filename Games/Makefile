TODAY := $(shell TZ=UTC date --rfc-3339=date)

all: ../docs/npb2024-results.json ../docs/npb2024-results.ndjson

../docs/npb2024-results.json: daily/$(TODAY).json
	node create_v2023.js daily/*.json > ../docs/npb2024-results.json

../docs/npb2024-results.ndjson: daily/$(TODAY).json
	node create_results.js daily/*.json > ../docs/npb2024-results.ndjson

daily/$(TODAY).json: 
	node create_games.js ../scraped/daily/$(TODAY).json
