TODAY := $(shell TZ=UTC date --rfc-3339=date)
.PHONY: today

../docs/npb2024-homeruns.ndjson: daily/*json daily/$(TODAY).json
	jq -c '.[]' daily/*json > ../docs/npb2024-homeruns.ndjson

daily/$(TODAY).json: 
	node extract_hrs.js ../Games/daily/$(TODAY).json
