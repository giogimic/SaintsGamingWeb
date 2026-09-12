import paramiko
import base64

host = 'saintsgaming.net'
user = 'debian'
password = 'Temp1992!'

python_code = '''
import sqlite3
import MySQLdb

# Connect to MariaDB
mariadb_conn = MySQLdb.connect(
    host="localhost", # assuming docker exposed or just use docker exec
    user="saints",
    passwd="ytCjnc25OOkEQNWi",
    db="saints_gaming",
    port=3306 # if exposed, else we need a different approach
)
'''

b64_py = base64.b64encode(python_code.encode()).decode()
print("Base64 string generated")
