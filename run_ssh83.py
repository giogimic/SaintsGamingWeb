import paramiko
import base64

host = 'saintsgaming.net'
user = 'debian'
password = 'Temp1992!'

py_sqlite_script = """
import json
import sqlite3

with open('/home/debian/payload.json', 'r') as f:
    m = json.load(f)

conn = sqlite3.connect('/home/debian/SaintsGamingWeb/the-lobby/data/go-mmo.db')
c = conn.cursor()

c.execute("SELECT COUNT(1) FROM WorldMap WHERE id=?", (m['id'],))
if c.fetchone()[0] == 0:
    c.execute('''
        INSERT INTO WorldMap (id, gameId, name, gridData, gatesData, npcsData, encountersData, tileLayersData, tilesetsData, mapType, version)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (m['id'], m['gameId'], m['name'], m['gridData'], m['gatesData'], m['npcsData'], m['encountersData'], m['tileLayersData'], m['tilesetsData'], m['mapType'], m['version']))
    print("Inserted map into SQLite!")
else:
    c.execute('''
        UPDATE WorldMap SET name=?, gridData=?, gatesData=?, npcsData=?, encountersData=?, tileLayersData=?, tilesetsData=?, mapType=?, version=?
        WHERE id=?
    ''', (m['name'], m['gridData'], m['gatesData'], m['npcsData'], m['encountersData'], m['tileLayersData'], m['tilesetsData'], m['mapType'], m['version'], m['id']))
    print("Updated map in SQLite!")

conn.commit()
conn.close()
"""

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(host, username=user, password=password)
    
    b64_py = base64.b64encode(py_sqlite_script.encode()).decode()
    
    cmd = f"""
    echo '{b64_py}' | base64 -d > ~/import.py &&
    python3 ~/import.py
    """
    
    print("Running sqlite insert...")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("STDOUT:", stdout.read().decode())
    print("STDERR:", stderr.read().decode())
    
    ssh.exec_command("echo 'Temp1992!' | sudo -S docker restart saints-gaming-web saints-lobby")
    print("Restarted containers.")

finally:
    ssh.close()
