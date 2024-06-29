subdirs := Players scraped/daily Games Homeruns StolenBases
.PHONY: $(subdirs)

all: $(subdirs)
clean: $(subdirs)

$(subdirs):
	make -C $@ $(MAKECMDGOALS)

