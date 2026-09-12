import paramiko
import base64

host = 'saintsgaming.net'
user = 'debian'
password = 'Temp1992!'

python_code = '''
import sqlite3
import MySQLdb
import json

mariadb_conn = MySQLdb.connect(
    host="127.0.0.1",
    user="saints",
    passwd="ytCjnc25OOkEQNWi",
    db="saints_gaming",
    port=3306
)
cursor = mariadb_conn.cursor(MySQLdb.cursors.DictCursor)

cursor.execute("SELECT * FROM WorldMap WHERE id='STARTING_MEADOW'")
meadow = cursor.fetchone()
if not meadow:
    print("No STARTING_MEADOW in MariaDB!")
    exit(1)

cursor.execute("SELECT * FROM WorldMapVersion WHERE mapId='STARTING_MEADOW' ORDER BY version DESC LIMIT 1")
ver = cursor.fetchone()
if not ver:
    print("No version for STARTING_MEADOW!")
    exit(1)

map_data = json.loads(ver['data'])

sqlite_conn = sqlite3.connect('/home/debian/SaintsGamingWeb/the-lobby/go-mmo.db')
c = sqlite_conn.cursor()

c.execute("SELECT COUNT(1) FROM WorldMap WHERE id='STARTING_MEADOW'")
if c.fetchone()[0] == 0:
    c.execute("""
        INSERT INTO WorldMap (id, gameId, name, gridData, gatesData, npcsData, encountersData, tileLayersData, tilesetsData, voxelData, mapType, version)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        meadow['id'],
        meadow['gameId'],
        meadow['name'],
        json.dumps(map_data.get('gridData', {})),
        json.dumps(map_data.get('gatesData', {})),
        json.dumps(map_data.get('npcsData', {})),
        json.dumps(map_data.get('encountersData', [])),
        json.dumps(map_data.get('tileLayersData', {})),
        json.dumps(map_data.get('tilesetsData', {})),
        json.dumps(map_data.get('voxelData', {})),
        meadow['mapType'],
        meadow['publishedVersion']
    ))
    sqlite_conn.commit()
    print("Inserted STARTING_MEADOW into SQLite!")
else:
    print("STARTING_MEADOW already in SQLite!")

cursor.execute("UPDATE SiteSetting SET value='STARTING_MEADOW' WHERE key='SPAWN_MAP_ID'")
cursor.execute("UPDATE SiteSetting SET value='STARTING_MEADOW' WHERE key='DEFAULT_MAP_ID'")
mariadb_conn.commit()
print("Updated SPAWN_MAP_ID in MariaDB to STARTING_MEADOW!")

mariadb_conn.close()
sqlite_conn.close()
'''

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(host, username=user, password=password)
    
    b64_py = base64.b64encode(python_code.encode()).decode()
    cmd = f"echo '{b64_py}' | base64 -d > ~/sync_db.py && python3 ~/sync_db.py && rm ~/sync_db.py"
    print(f'Running on remote...')
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("STDOUT:", stdout.read().decode())
    print("STDERR:", stderr.read().decode())
    
    # Restart docker containers
    ssh.exec_command("echo 'Temp1992!' | sudo -S docker restart saints-gaming-web saints-lobby")

finally:
    ssh.close()
