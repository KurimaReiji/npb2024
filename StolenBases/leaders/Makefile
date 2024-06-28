YESTERDAY := $(shell TZ='Asia/Jakarta' date -d "1 day ago" --rfc-3339=date)

$(YESTERDAY).json:
	node ./get_leaders.js
