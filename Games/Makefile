TODAY := $(shell TZ=UTC date --rfc-3339=date)

daily/$(TODAY).json: 
	node create_games.js ../scraped/daily/$(TODAY).json
