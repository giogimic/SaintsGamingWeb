import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

hostname = "saintsgaming.net"
username = "giogimic"
password = "REDACTED"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print(f"Connecting to {hostname}...")
    client.connect(hostname, username=username, password=password, timeout=10)

    def run_sudo(cmd):
        stdin, stdout, stderr = client.exec_command(f"echo {password} | sudo -S {cmd}", get_pty=True)
        out = stdout.read().decode('utf-8', errors='ignore')
        print(f"\n---> Running: {cmd}\n", out)
        return out

    print("Checking if beta directory exists...")
    # Create Beta Directory if it doesn't exist
    run_sudo("bash -c 'mkdir -p /home/giogimic/beta.saintsgaming.net'")
    
    # Check if git is already cloned
    stdout = run_sudo("bash -c 'if [ -d /home/giogimic/beta.saintsgaming.net/Saints-Gaming-Web ]; then echo \"EXISTS\"; fi'")
    
    if "EXISTS" not in stdout:
        print("Cloning repository into Beta directory...")
        run_sudo("bash -c 'cd /home/giogimic/beta.saintsgaming.net && git clone https://github.com/giogimic/SaintsGamingWeb.git Saints-Gaming-Web'")
    else:
        print("Pulling latest git changes in Beta directory...")
        run_sudo("bash -c 'cd /home/giogimic/beta.saintsgaming.net/Saints-Gaming-Web && git pull origin main'")

    print("Configuring docker-compose for port 3010...")
    # Dynamically change the docker compose file in the beta dir to use port 3010 and rename container
    run_sudo("bash -c 'cd /home/giogimic/beta.saintsgaming.net/Saints-Gaming-Web && cp docker-compose.base.yml docker-compose.yml'")
    run_sudo("bash -c 'cd /home/giogimic/beta.saintsgaming.net/Saints-Gaming-Web && sed -i \"s/- \\\"3000:3000\\\"/- \\\"3010:3000\\\"/g\" docker-compose.yml'")
    run_sudo("bash -c 'cd /home/giogimic/beta.saintsgaming.net/Saints-Gaming-Web && sed -i \"s/container_name: saints-gaming-web/container_name: saints-gaming-web-beta/g\" docker-compose.yml'")

    print("Building and starting beta containers...")
    # Stop existing beta container to avoid conflicts
    run_sudo("bash -c 'docker stop saints-gaming-web-beta || true && docker rm saints-gaming-web-beta || true'")
    run_sudo("bash -c 'cd /home/giogimic/beta.saintsgaming.net/Saints-Gaming-Web && DB_SKIP_MIGRATION=true docker compose up --build -d'")

    client.close()
    print("Beta deployment script finished.")
except Exception as e:
    print("Error:", e)
