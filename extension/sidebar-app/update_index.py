filepath = 'Z:\\christ-university\\HiDevsHackathonProject\\HiDevs.xyz - Hackathon Prep\\MeetMaxxing\\extension\\sidebar-app\\index.html'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

head_addition = '''
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Google+Sans+Text:wght@400;500;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/remixicon@4.5.0/fonts/remixicon.css" rel="stylesheet">
'''

if 'remixicon' not in content:
    content = content.replace('</head>', head_addition + '</head>')

content = content.replace('class="bg-[#0b0c10]"', '')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
