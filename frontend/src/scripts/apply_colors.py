import os
import re

def update_file(path, replacements):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    orig = content
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    if content != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {path}")

# Frontend Globals
frontend_css = "frontend/src/app/globals.css"
update_file(frontend_css, {
    "#1a1b20": "#141518",
    "#17181c": "#141518",
    "#23242a": "#27292c",
    "#28292f": "#27292c",
    "#2c2d34": "#27292c",
    # Leave 33353c (surface-container-high) which is likely meeting cards
    "#e2e8f8": "#ffffff",
    "#a8b8d0": "#868e96",
    "#8d9db5": "#7e7d78"
})

# Extension sidebar App.tsx
app_tsx = "extension/sidebar-app/src/App.tsx"
update_file(app_tsx, {
    "bg-[#131314]": "bg-[#141518]",
    "bg-[#1e1f20]": "bg-[#27292c]",
    "bg-[#1a1b1c]": "bg-[#27292c]",
    "bg-[#28292a]": "bg-[#27292c]",
    "text-[#e3e3e3]": "text-[#ffffff]",
    "text-[#8e918f]": "text-[#868e96]",
    "border-[#e3e3e3]/10": "border-[#ffffff]/10",
    "border-[#e3e3e3]/15": "border-[#ffffff]/15",
    "border-[#e3e3e3]/5": "border-[#ffffff]/5"
})

# Extension sidebar index.css
sidebar_css = "extension/sidebar-app/src/index.css"
update_file(sidebar_css, {
    "#131314": "#141518",
    "#1e1f20": "#27292c",
    "#28292a": "#27292c",
    "#e3e3e3": "#ffffff",
    "#c4c7c5": "#868e96"
})

# Extension sidepanel css
sidepanel_css = "extension/styles/sidepanel.css"
update_file(sidepanel_css, {
    "#1e2023": "#27292c",
    "#e3e3e3": "#ffffff"
})

print("Done")
