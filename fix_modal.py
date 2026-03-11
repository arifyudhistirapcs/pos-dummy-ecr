import re

# Read files
with open('index.html', 'r') as f:
    content = f.read()

with open('new_hosts_modal.html', 'r') as f:
    new_modal = f.read()

# Find the hosts modal section
start_marker = '<!-- DNS Hosts Setup Modal -->'
end_marker = '<!-- Certificate Setup Modal'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    print(f"Found modal at positions {start_idx} to {end_idx}")
    # Replace the content
    new_content = content[:start_idx] + new_modal + '\n\n    ' + content[end_idx:]
    
    with open('index.html', 'w') as f:
        f.write(new_content)
    print("✅ Modal berhasil diganti dengan yang baru!")
else:
    print(f"❌ Tidak ditemukan: start={start_idx}, end={end_idx}")
