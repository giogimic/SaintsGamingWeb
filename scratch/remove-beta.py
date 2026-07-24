import paramiko

HOSTNAME = 'saintsgaming.net'
USERNAME = 'giogimic'
PASSWORD = 'REDACTED'

def remove_beta():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"[*] Connecting to {HOSTNAME}...")
    ssh.connect(HOSTNAME, username=USERNAME, password=PASSWORD)

    commands = [
        "sudo docker stop saints-gaming-web-beta || true",
        "sudo docker rm saints-gaming-web-beta || true",
        "sudo rm -rf /home/giogimic/beta.saintsgaming.net || true",
        "sudo sed -i '/beta.saintsgaming.net/,/}/d' /etc/caddy/Caddyfile || true",
        "sudo systemctl reload caddy || true"
    ]

    for cmd in commands:
        print(f"[*] Executing: {cmd}")
        stdin, stdout, stderr = ssh.exec_command(f"echo '{PASSWORD}' | sudo -S bash -c '{cmd}'")
        out = stdout.read().decode()
        err = stderr.read().decode()
        if out:
            print(f"Output:\n{out}")
        if err and "password" not in err.lower():
            print(f"Error:\n{err}")

    # Check remaining docker containers
    stdin, stdout, stderr = ssh.exec_command("sudo docker ps")
    print("\n--- Remaining Docker Containers ---")
    print(stdout.read().decode())

    ssh.close()

if __name__ == '__main__':
    remove_beta()
