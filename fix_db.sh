#!/bin/bash
cd ~/SaintsGamingWeb
npx prisma studio &
PID=\$!
sleep 2
kill \31152
sqlite3 prisma/saints.db "UPDATE SiteSetting SET value = 'STARTING_MEADOW' WHERE key = 'SPAWN_MAP_ID';"
sqlite3 prisma/saints.db "INSERT OR IGNORE INTO SiteSetting (key, value) VALUES ('SPAWN_MAP_ID', 'STARTING_MEADOW');"
sqlite3 prisma/saints.db "UPDATE SiteSetting SET value = 'STARTING_MEADOW' WHERE key = 'DEFAULT_MAP_ID';"
sqlite3 prisma/saints.db "UPDATE Character SET metadata = json_set(metadata, '\$.lastMapId', 'STARTING_MEADOW') WHERE name = 'Zephyr52';"
