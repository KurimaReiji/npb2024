.PHONY: all

all: ../docs/npb2024-players.json

../docs/rosterHistory.ndjson: History/*json create_players.js
	jq -c '.[]' History/*json > ../docs/rosterHistory.ndjson

../docs/npb2024-players.json: ../docs/rosterHistory.ndjson
	node create_players.js > ../docs/npb2024-players.json

