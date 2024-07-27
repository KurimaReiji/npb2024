TODAY := $(shell TZ=UTC date --rfc-3339=date)

../docs/runnerEvents.ndjson: daily/*.json daily/$(TODAY).json addenda/$(TODAY).json
	node create_ndjson.js
	mv runnerEvents.ndjson ../docs/runnerEvents.ndjson

daily/$(TODAY).json: ../Games/daily/$(TODAY).json
	@node extract_sbs.js ../Games/daily/$(TODAY).json

addenda/$(TODAY).json:
	@node addenda.js $(TODAY)

.PHONY: leaders
leaders:
	make -C $@
